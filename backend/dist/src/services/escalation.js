import dayjs from 'dayjs';
import { Post } from '../models/Post.js';
import { Issue } from '../models/Issue.js';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { getIO } from './socket.js';
import { EVENTS } from '../utils/constants.js';
export function computeEngagementScore({ likes, comments, shares }) {
    return likes + 3 * comments + 2 * shares;
}
export async function maybeEscalate(postId) {
    const post = await Post.findById(postId);
    if (!post)
        return;
    const score = computeEngagementScore({ likes: post.likesCount, comments: post.commentsCount, shares: post.sharesCount });
    if (score >= env.ISSUE_ESCALATION_SCORE && !post.isEscalated) {
        const user = await User.findById(post.authorId);
        if (!user)
            return;
        const issue = await Issue.create({
            sourcePostId: post._id,
            status: 'pending',
            priority: score,
            progressPercent: 0,
            extendedOnce: false,
            beforeImages: post.media.map((m) => m.publicId),
            afterImages: [],
            userSnapshot: { id: String(user._id), name: user.name, avatar: user.avatarUrl || '', email: user.email, reportCount: user.reportCount },
        });
        post.isEscalated = true;
        post.engagementScore = score;
        await post.save();
        const io = getIO();
        io.emit(EVENTS.POST_ESCALATED, { postId: String(post._id) });
        io.emit(EVENTS.ISSUE_CREATED, { issueId: String(issue._id), postId: String(post._id) });
    }
    else {
        post.engagementScore = score;
        await post.save();
    }
}
export async function adminMarkInvalid(issueId, reason) {
    const issue = await Issue.findById(issueId);
    if (!issue)
        throw Object.assign(new Error('Issue not found'), { status: 404, code: 'NOT_FOUND' });
    const post = await Post.findById(issue.sourcePostId);
    if (!post)
        throw Object.assign(new Error('Post not found'), { status: 404, code: 'NOT_FOUND' });
    const user = await User.findById(post.authorId);
    if (!user)
        throw Object.assign(new Error('User not found'), { status: 404, code: 'NOT_FOUND' });
    issue.status = 'rejected';
    await issue.save();
    user.reportCount = (user.reportCount || 0) + 1;
    if (user.reportCount >= 5) {
        user.postBanUntil = dayjs().add(10, 'day').toDate();
    }
    await user.save();
    const io = getIO();
    io.emit(EVENTS.USER_ENFORCEMENT_UPDATED, { userId: String(user._id), reportCount: user.reportCount, suspendedUntil: user.postBanUntil || null, reason });
}
//# sourceMappingURL=escalation.js.map