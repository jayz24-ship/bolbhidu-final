import dayjs from 'dayjs';
import { Post } from '../models/Post.js';
import { Issue } from '../models/Issue.js';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { getIO } from './socket.js';
import { EVENTS, ROOMS } from '../utils/constants.js';
import { createNotification } from './notification.js';

export function computeEngagementScore({ likes, comments, shares }: { likes: number; comments: number; shares: number }) {
  return likes + 3 * comments + 2 * shares;
}

export async function maybeEscalate(postId: string) {
  const post = await Post.findById(postId);
  if (!post) return;
  
  const score = computeEngagementScore({ likes: post.likesCount, comments: post.commentsCount, shares: post.sharesCount });
  console.log(`[Escalation] Post ${postId} engagement score: ${score} (threshold: ${env.ISSUE_ESCALATION_SCORE})`);
  
  if (score >= env.ISSUE_ESCALATION_SCORE && !post.isEscalated) {
    const user = await User.findById(post.authorId);
    if (!user) {
      console.error(`[Escalation] User ${post.authorId} not found for post ${postId}`);
      return;
    }
    
    console.log(`[Escalation] 🔥 Escalating post ${postId} to issue for author ${user.name} (${user._id})`);
    
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

    // Create notification for post author ONLY
    const postPreview = post.description.length > 50 
      ? post.description.substring(0, 50) + '...'
      : post.description;
    
    console.log(`[Escalation] 📢 Sending escalation notification to post author: ${user.name} (${user._id})`);
    
    await createNotification({
      userId: post.authorId, // Only the post author gets the notification
      type: 'post_escalated',
      title: '🔥 Your post has gained attention!',
      message: `Your post "${postPreview}" has been escalated to an issue and will be reviewed by administrators.`,
      data: {
        postId: String(post._id),
        issueId: String(issue._id),
        engagementScore: score,
        likes: post.likesCount,
        comments: post.commentsCount,
        shares: post.sharesCount
      },
      socketEvent: EVENTS.POST_ESCALATED,
    });

    // Send socket notification ONLY to post author (not globally)
    const io = getIO();
    const authorRoom = ROOMS.user(post.authorId.toString());
    
    console.log(`[Escalation] 📡 Sending socket notification to author room: ${authorRoom}`);
    
    io.to(authorRoom).emit(EVENTS.POST_ESCALATED, { 
      postId: String(post._id),
      issueId: String(issue._id),
      engagementScore: score,
      message: `Your post has been escalated to an issue due to high community engagement!`
    });
    
    // Emit global issue created event for admin dashboard (but not escalation notification)
    io.emit(EVENTS.ISSUE_CREATED, { 
      issueId: String(issue._id), 
      postId: String(post._id),
      priority: score
    });
    
    console.log(`[Escalation] ✅ Successfully escalated post ${postId} to issue ${issue._id} - notification sent ONLY to author`);
  } else {
    post.engagementScore = score;
    await post.save();
    console.log(`[Escalation] Post ${postId} engagement score updated to ${score} (no escalation needed)`);
  }
}

export async function adminMarkInvalid(issueId: string, reason?: string) {
  const issue = await Issue.findById(issueId);
  if (!issue) throw Object.assign(new Error('Issue not found'), { status: 404, code: 'NOT_FOUND' });
  const post = await Post.findById(issue.sourcePostId);
  if (!post) throw Object.assign(new Error('Post not found'), { status: 404, code: 'NOT_FOUND' });
  const user = await User.findById(post.authorId);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404, code: 'NOT_FOUND' });

  issue.status = 'rejected';
  issue.rejectedAt = new Date(); // Mark when issue was rejected
  await issue.save();
  
  console.log(`[Admin] Issue ${issueId} rejected at ${issue.rejectedAt.toISOString()} - post will be hidden from feed after 24 hours`);

  user.reportCount = (user.reportCount || 0) + 1;
  if (user.reportCount >= 5) {
    user.postBanUntil = dayjs().add(10, 'day').toDate();
  }
  await user.save();

  const io = getIO();
  io.emit(EVENTS.USER_ENFORCEMENT_UPDATED, { userId: String(user._id), reportCount: user.reportCount, suspendedUntil: user.postBanUntil || null, reason });
}
