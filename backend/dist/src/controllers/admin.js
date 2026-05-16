import dayjs from 'dayjs';
import { Issue } from '../models/Issue.js';
import { Post } from '../models/Post.js';
import { issueToAdminDTO } from '../utils/dto.js';
import { adminMarkInvalid } from '../services/escalation.js';
import { getIO } from '../services/socket.js';
import { EVENTS, ROOMS } from '../utils/constants.js';
export async function listIssues(req, res) {
    const status = String(req.query.status || '').toLowerCase();
    const filter = {};
    if (status && ['pending', 'in_progress', 'completed', 'rejected'].includes(status))
        filter.status = status;
    const issues = await Issue.find(filter).sort({ priority: -1, createdAt: -1 }).limit(200);
    const posts = await Post.find({ _id: { $in: issues.map((i) => i.sourcePostId) } });
    const postMap = new Map(posts.map((p) => [String(p._id), p]));
    const dtos = issues.map((i) => {
        const post = postMap.get(i.sourcePostId.toString());
        if (!post)
            return null;
        return issueToAdminDTO(i, post);
    }).filter((dto) => dto !== null);
    res.json({ issues: dtos });
}
export async function getIssue(req, res) {
    const i = await Issue.findById(req.params.id);
    if (!i)
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Issue not found' } });
    const post = await Post.findById(i.sourcePostId);
    if (!post)
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
    res.json(issueToAdminDTO(i, post));
}
export async function validateIssue(req, res) {
    const { etaDays } = req.body || {};
    if (typeof etaDays !== 'number' || etaDays <= 0)
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'etaDays must be > 0' } });
    const i = await Issue.findById(req.params.id);
    if (!i)
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Issue not found' } });
    const post = await Post.findById(i.sourcePostId);
    if (!post)
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
    i.status = 'in_progress';
    i.progressPercent = 0;
    i.eta = dayjs().add(etaDays, 'day').toDate();
    i.deadlineAt = dayjs().add(etaDays, 'day').toDate();
    await i.save();
    // Notify post author
    const io = getIO();
    io.to(ROOMS.user(post.authorId.toString())).emit(EVENTS.ISSUE_VALIDATED, {
        issueId: String(i._id),
        postId: String(post._id),
        etaDays,
        deadline: i.deadlineAt.toISOString()
    });
    res.json({ success: true });
}
export async function updateIssueProgress(req, res) {
    const { progressPercent } = req.body || {};
    if (typeof progressPercent !== 'number' || progressPercent < 0 || progressPercent > 100) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'progressPercent must be 0-100' } });
    }
    const i = await Issue.findById(req.params.id);
    if (!i)
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Issue not found' } });
    const post = await Post.findById(i.sourcePostId);
    if (!post)
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
    i.progressPercent = progressPercent;
    await i.save();
    // Notify post author
    const io = getIO();
    io.to(ROOMS.user(post.authorId.toString())).emit(EVENTS.ISSUE_UPDATED, {
        issueId: String(i._id),
        postId: String(post._id),
        progress: progressPercent
    });
    res.json({ success: true });
}
export async function extendDeadline(req, res) {
    const i = await Issue.findById(req.params.id);
    if (!i)
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Issue not found' } });
    if (i.extendedOnce)
        return res.status(409).json({ error: { code: 'ALREADY_EXTENDED', message: 'Deadline already extended once' } });
    i.deadlineAt = dayjs(i.deadlineAt || new Date()).add(5, 'day').toDate();
    i.extendedOnce = true;
    await i.save();
    res.json({ deadlineExtended: true });
}
export async function completeIssue(req, res) {
    const { afterImages } = req.body || {};
    if (!Array.isArray(afterImages) || afterImages.length === 0)
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'afterImages[] required' } });
    const i = await Issue.findById(req.params.id);
    if (!i)
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Issue not found' } });
    if (!i.beforeImages || i.beforeImages.length === 0)
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'beforeImages required before completing' } });
    const post = await Post.findById(i.sourcePostId);
    if (!post)
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
    i.afterImages = afterImages;
    i.status = 'completed';
    i.progressPercent = 100;
    await i.save();
    // Notify post author
    const io = getIO();
    io.to(ROOMS.user(post.authorId.toString())).emit(EVENTS.ISSUE_COMPLETED, {
        issueId: String(i._id),
        postId: String(post._id)
    });
    res.json({ success: true });
}
export async function uploadIssueImages(req, res) {
    // For simplicity, accept JSON with beforeImages/afterImages; FE can be adapted to send after signature-based uploads
    const { beforeImages, afterImages } = req.body || {};
    const i = await Issue.findById(req.params.id);
    if (!i)
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Issue not found' } });
    if (Array.isArray(beforeImages))
        i.beforeImages = beforeImages;
    if (Array.isArray(afterImages))
        i.afterImages = afterImages;
    await i.save();
    res.json({ success: true });
}
export async function markInvalid(req, res) {
    const { reason } = req.body || {};
    const i = await Issue.findById(req.params.id);
    if (!i)
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Issue not found' } });
    const post = await Post.findById(i.sourcePostId);
    if (!post)
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
    await adminMarkInvalid(req.params.id, reason);
    // Notify post author
    const io = getIO();
    io.to(ROOMS.user(post.authorId.toString())).emit(EVENTS.ISSUE_REJECTED, {
        issueId: String(i._id),
        postId: String(post._id),
        reason: reason || 'Issue marked as invalid by admin'
    });
    res.json({ success: true });
}
//# sourceMappingURL=admin.js.map