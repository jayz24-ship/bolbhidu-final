import { Request, Response } from 'express';
import dayjs from 'dayjs';
import { Issue } from '../models/Issue.js';
import { Post } from '../models/Post.js';
import { issueToAdminDTO } from '../utils/dto.js';
import { adminMarkInvalid } from '../services/escalation.js';
import { getIO } from '../services/socket.js';
import { EVENTS, ROOMS } from '../utils/constants.js';
import { createNotification } from '../services/notification.js';

export async function listIssues(req: Request, res: Response) {
  const status = String(req.query.status || '').toLowerCase();
  const filter: any = {};
  if (status && ['pending','in_progress','completed','rejected'].includes(status)) filter.status = status;
  const issues = await Issue.find(filter).sort({ priority: -1, createdAt: -1 }).limit(200);
  const posts = await Post.find({ _id: { $in: issues.map((i) => i.sourcePostId) } });
  const postMap = new Map(posts.map((p) => [String(p._id), p]));
  const dtos = issues.map((i) => {
    const post = postMap.get(i.sourcePostId.toString());
    if (!post) return null;
    return issueToAdminDTO(i, post);
  }).filter((dto): dto is NonNullable<typeof dto> => dto !== null);
  res.json({ issues: dtos });
}

export async function getIssue(req: Request, res: Response) {
  const i = await Issue.findById(req.params.id);
  if (!i) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Issue not found' } });
  const post = await Post.findById(i.sourcePostId);
  if (!post) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
  res.json(issueToAdminDTO(i, post));
}

export async function validateIssue(req: Request, res: Response) {
  const { etaDays } = req.body || {};
  if (typeof etaDays !== 'number' || etaDays <= 0) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'etaDays must be > 0' } });
  const i = await Issue.findById(req.params.id);
  if (!i) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Issue not found' } });
  
  const post = await Post.findById(i.sourcePostId);
  if (!post) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
  
  i.status = 'in_progress';
  i.progressPercent = 0;
  i.eta = dayjs().add(etaDays, 'day').toDate();
  i.deadlineAt = dayjs().add(etaDays, 'day').toDate();
  await i.save();
  
  console.log(`[Admin] Issue ${req.params.id} validated - sending notification to author ${post.authorId}`);
  
  // Create database notification for post author
  const postPreview = post.description.length > 50 
    ? post.description.substring(0, 50) + '...'
    : post.description;
  
  await createNotification({
    userId: post.authorId,
    type: 'issue_validated',
    title: '🚀 Your issue is now in progress!',
    message: `Your reported issue "${postPreview}" has been validated by administrators and is now being worked on. Expected completion: ${etaDays} days.`,
    data: {
      issueId: String(i._id),
      postId: String(post._id),
      etaDays,
      deadline: i.deadlineAt.toISOString(),
      status: 'in_progress'
    },
    socketEvent: EVENTS.ISSUE_VALIDATED,
  });
  
  // Also send socket notification
  const io = getIO();
  io.to(ROOMS.user(post.authorId.toString())).emit(EVENTS.ISSUE_VALIDATED, {
    issueId: String(i._id),
    postId: String(post._id),
    etaDays,
    deadline: i.deadlineAt.toISOString()
  });
  
  res.json({ success: true });
}

export async function updateIssueProgress(req: Request, res: Response) {
  const { progressPercent } = req.body || {};
  if (typeof progressPercent !== 'number' || progressPercent < 0 || progressPercent > 100) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'progressPercent must be 0-100' } });
  }
  const i = await Issue.findById(req.params.id);
  if (!i) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Issue not found' } });
  
  const post = await Post.findById(i.sourcePostId);
  if (!post) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
  
  i.progressPercent = progressPercent;
  await i.save();
  
  console.log(`[Admin] Issue ${req.params.id} progress updated to ${progressPercent}% - sending notification to author ${post.authorId}`);
  
  // Create database notification for progress updates (only for significant milestones)
  let shouldNotify = false;
  let title = '';
  let message = '';
  
  if (progressPercent >= 25 && progressPercent < 50) {
    shouldNotify = true;
    title = '🔧 Your issue is 25% complete';
    message = `Work has begun on your reported issue. Current progress: ${progressPercent}%`;
  } else if (progressPercent >= 50 && progressPercent < 75) {
    shouldNotify = true;
    title = '⏰ Your issue is halfway done!';
    message = `Good progress on your reported issue. Current progress: ${progressPercent}%`;
  } else if (progressPercent >= 75 && progressPercent < 100) {
    shouldNotify = true;
    title = '🏁 Your issue is almost complete!';
    message = `Your reported issue is nearing completion. Current progress: ${progressPercent}%`;
  }
  
  if (shouldNotify) {
    const postPreview = post.description.length > 50 
      ? post.description.substring(0, 50) + '...'
      : post.description;
    
    await createNotification({
      userId: post.authorId,
      type: 'issue_updated',
      title,
      message: `${message} Issue: "${postPreview}"`,
      data: {
        issueId: String(i._id),
        postId: String(post._id),
        progress: progressPercent,
        status: i.status
      },
      socketEvent: EVENTS.ISSUE_UPDATED,
    });
  }
  
  // Always send socket notification for real-time updates
  const io = getIO();
  io.to(ROOMS.user(post.authorId.toString())).emit(EVENTS.ISSUE_UPDATED, {
    issueId: String(i._id),
    postId: String(post._id),
    progress: progressPercent
  });
  
  res.json({ success: true });
}

export async function extendDeadline(req: Request, res: Response) {
  const i = await Issue.findById(req.params.id);
  if (!i) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Issue not found' } });
  if (i.extendedOnce) return res.status(409).json({ error: { code: 'ALREADY_EXTENDED', message: 'Deadline already extended once' } });
  i.deadlineAt = dayjs(i.deadlineAt || new Date()).add(5, 'day').toDate();
  i.extendedOnce = true;
  await i.save();
  res.json({ deadlineExtended: true });
}

export async function completeIssue(req: Request, res: Response) {
  const { afterImages } = req.body || {};
  if (!Array.isArray(afterImages) || afterImages.length === 0) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'afterImages[] required' } });
  const i = await Issue.findById(req.params.id);
  if (!i) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Issue not found' } });
  if (!i.beforeImages || i.beforeImages.length === 0) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'beforeImages required before completing' } });
  
  const post = await Post.findById(i.sourcePostId);
  if (!post) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
  
  i.afterImages = afterImages;
  i.status = 'completed';
  i.progressPercent = 100;
  await i.save();
  
  console.log(`[Admin] Issue ${req.params.id} completed - sending notification to author ${post.authorId}`);
  
  // Create database notification for issue completion (MAIN FIX)
  const postPreview = post.description.length > 50 
    ? post.description.substring(0, 50) + '...'
    : post.description;
  
  console.log(`[Admin] Creating completion notification for user ${post.authorId}...`);
  
  try {
    const notification = await createNotification({
      userId: post.authorId,
      type: 'issue_completed',
      title: '✅ Your issue has been resolved!',
      message: `Great news! Your reported issue "${postPreview}" has been successfully resolved by the city authorities. Thank you for helping improve our community!`,
      data: {
        issueId: String(i._id),
        postId: String(post._id),
        status: 'completed',
        progress: 100,
        completedAt: new Date().toISOString(),
        afterImages
      },
      socketEvent: EVENTS.ISSUE_COMPLETED,
    });
    
    console.log(`[Admin] ✅ Completion notification created successfully:`, {
      notificationId: notification ? String(notification._id) : 'undefined',
      userId: post.authorId,
      type: 'issue_completed'
    });
  } catch (notificationError) {
    console.error(`[Admin] ❌ Failed to create completion notification:`, notificationError);
  }
  
  // Also send socket notification
  const io = getIO();
  io.to(ROOMS.user(post.authorId.toString())).emit(EVENTS.ISSUE_COMPLETED, {
    issueId: String(i._id),
    postId: String(post._id),
    message: 'Your reported issue has been successfully resolved!'
  });
  
  res.json({ success: true });
}

export async function uploadIssueImages(req: Request, res: Response) {
  // For simplicity, accept JSON with beforeImages/afterImages; FE can be adapted to send after signature-based uploads
  const { beforeImages, afterImages } = req.body || {};
  const i = await Issue.findById(req.params.id);
  if (!i) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Issue not found' } });
  if (Array.isArray(beforeImages)) i.beforeImages = beforeImages;
  if (Array.isArray(afterImages)) i.afterImages = afterImages;
  await i.save();
  res.json({ success: true });
}

// Test endpoint for debugging notifications
export async function testNotification(req: Request, res: Response) {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'userId required' } });
  }
  
  console.log(`[Admin] Testing notification creation for user: ${userId}`);
  
  try {
    const notification = await createNotification({
      userId,
      type: 'issue_completed',
      title: '🎉 Test Notification - Issue Resolved!',
      message: 'This is a test notification to verify the notification system is working correctly.',
      data: {
        testId: 'debug-' + Date.now(),
        issueId: 'test-issue',
        postId: 'test-post',
        status: 'completed'
      },
      socketEvent: EVENTS.ISSUE_COMPLETED,
    });
    
    console.log(`[Admin] Test notification created:`, {
      notificationId: String(notification._id),
      userId,
      createdAt: notification.createdAt
    });
    
    return res.json({ 
      success: true, 
      notificationId: String(notification._id),
      message: 'Test notification created successfully'
    });
  } catch (error: any) {
    console.error(`[Admin] Test notification failed:`, error);
    return res.status(500).json({ 
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Failed to create test notification',
        details: error.message
      } 
    });
  }
}

export async function markInvalid(req: Request, res: Response) {
  const { reason } = req.body || {};
  const i = await Issue.findById(req.params.id);
  if (!i) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Issue not found' } });
  
  const post = await Post.findById(i.sourcePostId);
  if (!post) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
  
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
