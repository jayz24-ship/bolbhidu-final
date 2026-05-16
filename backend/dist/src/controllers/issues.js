import { Issue } from '../models/Issue.js';
import { Post } from '../models/Post.js';
import { issueToAdminDTO } from '../utils/dto.js';
export async function getIssuePublic(req, res) {
    const i = await Issue.findById(req.params.id);
    if (!i)
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Issue not found' } });
    const post = await Post.findById(i.sourcePostId);
    if (!post)
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
    // sanitized public DTO
    return res.json({
        id: String(i._id),
        postId: String(post._id),
        status: i.status,
        progress: i.progressPercent,
        deadline: i.deadlineAt ? i.deadlineAt.toISOString() : null,
    });
}
export async function getMyIssues(req, res) {
    const userId = req.user.id;
    // Find only in_progress issues where the user snapshot ID matches
    const issues = await Issue.find({
        'userSnapshot.id': userId,
        status: 'in_progress'
    });
    // Get the corresponding posts
    const postIds = issues.map(i => i.sourcePostId);
    const posts = await Post.find({ _id: { $in: postIds } });
    const postsMap = new Map(posts.map(p => [String(p._id), p]));
    // Build DTOs
    const dtos = issues.map(i => {
        const post = postsMap.get(i.sourcePostId.toString());
        if (!post)
            return null;
        return issueToAdminDTO(i, post);
    }).filter(dto => dto !== null);
    return res.json({ issues: dtos });
}
//# sourceMappingURL=issues.js.map