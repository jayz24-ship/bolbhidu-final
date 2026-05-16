import mongoose from 'mongoose';
import { Post } from '../models/Post.js';
import { Like } from '../models/Like.js';
import { Comment } from '../models/Comment.js';
import { SavedPost } from '../models/SavedPost.js';
import { User } from '../models/User.js';
import { getPagination } from '../utils/pagination.js';
import { postToFeedDTO } from '../utils/dto.js';
import { enqueueAndValidatePost } from '../services/aiValidation.js';
import { maybeEscalate } from '../services/escalation.js';
import { EVENTS, ROOMS } from '../utils/constants.js';
import { getIO } from '../services/socket.js';
import { env } from '../config/env.js';
import { createNotification } from '../services/notification.js';
export async function createPost(req, res) {
    const authUser = req.user?.doc;
    if (!authUser)
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
    if (authUser.postBanUntil && new Date() < new Date(authUser.postBanUntil)) {
        return res.status(403).json({ error: { code: 'BANNED', message: 'Posting temporarily suspended', details: { expiresAt: authUser.postBanUntil } } });
    }
    const { description, category, location, lat, lng, media } = req.body || {};
    if (!description || !category || !location || typeof lat !== 'number' || typeof lng !== 'number') {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing fields' } });
    }
    const post = await Post.create({
        authorId: authUser._id,
        description,
        category,
        locationName: location,
        location: { type: 'Point', coordinates: [lng, lat] },
        media: (media || []).map((m) => ({ publicId: m.publicId, type: m.type })),
        aiVerdict: 'pending',
    });
    // emit feed.post.created to nearby users optionally – skipping geo room; emit to author room
    const io = getIO();
    io.to(ROOMS.user(String(authUser._id))).emit(EVENTS.FEED_POST_CREATED, { postId: String(post._id) });
    enqueueAndValidatePost(post);
    return res.status(201).json({ id: String(post._id), aiVerdict: 'pending' });
}
export async function getFeed(req, res) {
    const userId = req.user?.id;
    const { page, limit, skip } = getPagination(req.query, { page: 1, limit: 10 });
    const lat = parseFloat(String(req.query.lat));
    const lng = parseFloat(String(req.query.lng));
    const radiusKm = parseFloat(String(req.query.radiusKm || env.FEED_RADIUS_KM));
    const query = {
        aiVerdict: 'accepted',
    };
    // Simple query without geospatial for now
    const [items, total] = await Promise.all([
        Post.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Post.countDocuments(query),
    ]);
    const authorIds = items.map((p) => p.authorId);
    const authors = await User.find({ _id: { $in: authorIds } });
    const authorsMap = new Map(authors.map((a) => [String(a._id), a]));
    const likedSet = new Set();
    if (userId) {
        const likes = await Like.find({ userId: new mongoose.Types.ObjectId(userId), postId: { $in: items.map((i) => i._id) } });
        likes.forEach((l) => likedSet.add(l.postId.toString()));
    }
    // Fetch issue data for escalated posts
    const { Issue } = await import('../models/Issue.js');
    const postIds = items.map(p => p._id);
    const issues = await Issue.find({ sourcePostId: { $in: postIds } });
    const issuesMap = new Map(issues.map(i => [i.sourcePostId.toString(), i]));
    // Check registration as issue via isEscalated
    const dtos = items.map((p) => {
        const author = authorsMap.get(p.authorId.toString());
        if (!author)
            return null;
        const issue = issuesMap.get(String(p._id));
        return postToFeedDTO(p, author, likedSet.has(String(p._id)), !!p.isEscalated, issue?.progressPercent, issue?.status);
    }).filter((dto) => dto !== null);
    const totalPages = Math.ceil(total / limit);
    res.json({ items: dtos, hasMore: page < totalPages, page, totalPages });
}
export async function getPost(req, res) {
    const p = await Post.findById(req.params.id);
    if (!p)
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
    return res.json(p);
}
export async function likePost(req, res) {
    const userId = req.user?.id;
    const userName = req.user?.doc?.name || 'Someone';
    const postId = req.params.id;
    if (!userId)
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
    // Get post to find author
    const post = await Post.findById(postId);
    if (!post)
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
    try {
        await Like.updateOne({ postId, userId }, { $setOnInsert: { postId, userId } }, { upsert: true });
    }
    catch { }
    const likes = await Like.countDocuments({ postId });
    await Post.findByIdAndUpdate(postId, { likesCount: likes });
    await maybeEscalate(postId);
    const io = getIO();
    // Emit to post room for real-time updates
    io.to(ROOMS.post(postId)).emit(EVENTS.POST_LIKE_UPDATED, { postId, likes });
    // Notify post author (but not if they liked their own post)
    if (post.authorId.toString() !== userId) {
        const message = `${userName} liked your post`;
        await createNotification({
            userId: post.authorId,
            type: 'post_liked',
            title: 'New Like',
            message,
            data: { postId, likes, likedBy: userName, likedByUserId: userId },
            socketEvent: EVENTS.POST_LIKE_UPDATED,
        });
    }
    return res.json({ success: true });
}
export async function unlikePost(req, res) {
    const userId = req.user?.id;
    const postId = req.params.id;
    if (!userId)
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
    await Like.deleteOne({ postId, userId });
    const likes = await Like.countDocuments({ postId });
    await Post.findByIdAndUpdate(postId, { likesCount: likes });
    await maybeEscalate(postId);
    const io = getIO();
    io.to(ROOMS.post(postId)).emit(EVENTS.POST_LIKE_UPDATED, { postId, likes });
    return res.json({ success: true });
}
export async function getComments(req, res) {
    const postId = req.params.id;
    const comments = await Comment.find({ postId }).sort({ createdAt: -1 });
    // Get author details for each comment
    const authorIds = comments.map(c => c.authorId);
    const authors = await User.find({ _id: { $in: authorIds } });
    const authorsMap = new Map(authors.map(a => [String(a._id), a]));
    const commentDtos = comments.map(c => {
        const author = authorsMap.get(String(c.authorId));
        return {
            id: String(c._id),
            postId: String(c.postId),
            userId: String(c.authorId),
            username: author?.name || 'User',
            userAvatar: author?.avatarUrl || '',
            content: c.text,
            createdAt: c.createdAt.toISOString(),
        };
    });
    return res.json(commentDtos);
}
export async function addComment(req, res) {
    const userId = req.user?.id;
    const userName = req.user?.doc?.name || 'Someone';
    const postId = req.params.id;
    const { content } = req.body || {};
    if (!userId)
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
    if (!content)
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'content required' } });
    // Get post to find author
    const post = await Post.findById(postId);
    if (!post)
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
    const c = await Comment.create({ postId, authorId: userId, text: content });
    const comments = await Comment.countDocuments({ postId });
    await Post.findByIdAndUpdate(postId, { commentsCount: comments });
    await maybeEscalate(postId);
    const io = getIO();
    // Emit to post room
    io.to(ROOMS.post(postId)).emit(EVENTS.POST_COMMENT_CREATED, { postId, commentId: String(c._id) });
    // Notify post author (but not if they commented on their own post)
    if (post.authorId.toString() !== userId) {
        const commentPreview = content.length > 50 ? content.slice(0, 50) + '...' : content;
        const message = `${userName} commented: "${commentPreview}"`;
        await createNotification({
            userId: post.authorId,
            type: 'post_commented',
            title: 'New Comment',
            message,
            data: { postId, commentId: String(c._id), commentedBy: userName, commentedByUserId: userId, commentText: content },
            socketEvent: EVENTS.POST_COMMENT_CREATED,
        });
    }
    return res.status(201).json({ id: String(c._id), content: c.text, timestamp: c.createdAt.toISOString() });
}
export async function sharePost(req, res) {
    const userId = req.user?.id;
    const userName = req.user?.doc?.name || 'Someone';
    const postId = req.params.id;
    if (!userId)
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
    const post = await Post.findById(postId);
    if (!post)
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
    await Post.findByIdAndUpdate(postId, { $inc: { sharesCount: 1 } });
    await maybeEscalate(postId);
    // Notify post author (but not if they shared their own post)
    if (post.authorId.toString() !== userId) {
        const message = `${userName} shared your post`;
        await createNotification({
            userId: post.authorId,
            type: 'post_shared',
            title: 'Post Shared',
            message,
            data: { postId, sharedBy: userName, sharedByUserId: userId },
            socketEvent: 'post.share.created',
        });
    }
    return res.json({ success: true });
}
export async function savePost(req, res) {
    const userId = req.user?.id;
    const postId = req.params.id;
    if (!userId)
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
    await SavedPost.findOneAndUpdate({ userId, postId }, { userId, postId }, { upsert: true });
    return res.json({ success: true, saved: true });
}
export async function unsavePost(req, res) {
    const userId = req.user?.id;
    const postId = req.params.id;
    if (!userId)
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
    await SavedPost.deleteOne({ userId, postId });
    return res.json({ success: true, saved: false });
}
export async function deletePost(req, res) {
    const userId = req.user?.id;
    const postId = req.params.id;
    if (!userId)
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
    const post = await Post.findById(postId);
    if (!post)
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
    // Check if user is the author
    if (post.authorId.toString() !== userId) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only delete your own posts' } });
    }
    // Check if post has been escalated to an issue
    if (post.isEscalated) {
        return res.status(403).json({
            error: {
                code: 'FORBIDDEN',
                message: 'Cannot delete post that has been registered as an issue. Please contact admin.'
            }
        });
    }
    // Delete the post
    await Post.findByIdAndDelete(postId);
    // Clean up related data
    await Like.deleteMany({ postId });
    await Comment.deleteMany({ postId });
    await SavedPost.deleteMany({ postId });
    return res.json({ success: true, message: 'Post deleted successfully' });
}
export async function getSavedPosts(req, res) {
    const userId = req.user?.id;
    if (!userId)
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
    const { page, limit, skip } = getPagination(req.query, { page: 1, limit: 20 });
    const savedPosts = await SavedPost.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const postIds = savedPosts.map(sp => sp.postId);
    const posts = await Post.find({ _id: { $in: postIds } });
    const authorIds = posts.map(p => p.authorId);
    const authors = await User.find({ _id: { $in: authorIds } });
    const authorsMap = new Map(authors.map(a => [String(a._id), a]));
    const likedSet = new Set();
    const likes = await Like.find({ userId: new mongoose.Types.ObjectId(userId), postId: { $in: postIds } });
    likes.forEach(l => likedSet.add(l.postId.toString()));
    const dtos = posts.map(p => {
        const author = authorsMap.get(p.authorId.toString());
        if (!author)
            return null;
        return postToFeedDTO(p, author, likedSet.has(String(p._id)), !!p.isEscalated);
    }).filter((dto) => dto !== null);
    const total = await SavedPost.countDocuments({ userId });
    const totalPages = Math.ceil(total / limit);
    return res.json({ items: dtos, hasMore: page < totalPages, page, totalPages });
}
//# sourceMappingURL=posts.js.map