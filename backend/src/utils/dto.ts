import { IUserDoc } from '../models/User.js';
import { IPostDoc } from '../models/Post.js';
import { IIssueDoc } from '../models/Issue.js';
import { v2 as cloudinary } from 'cloudinary';
import { Types } from 'mongoose';

export function userToDTO(u: IUserDoc) {
  return {
    id: String(u._id),
    email: u.email,
    name: u.name,
    avatar: u.avatarUrl || '',
    bio: u.bio || '',
    location: u.location || '',
    isAdmin: u.role === 'admin',
    reportCount: u.reportCount || 0,
    suspendedUntil: u.postBanUntil ? u.postBanUntil.toISOString() : null,
  };
}

export function postToFeedDTO(p: IPostDoc, author: IUserDoc, isLiked: boolean, isRegisteredAsIssue: boolean, issueProgress?: number, issueStatus?: string) {
  const firstMedia = p.media[0];
  const mediaUrl = firstMedia
    ? cloudinary.url(firstMedia.publicId, {
        resource_type: firstMedia.type === 'video' ? 'video' : 'image',
        transformation: firstMedia.type === 'image' ? [{ width: 1200, crop: 'scale' }] : [],
      })
    : '';

  return {
    id: String(p._id),
    userId: String(author._id),
    username: author.name,
    userAvatar: author.avatarUrl || '',
    userEmail: author.email,
    description: p.description,
    category: p.category,
    location: p.locationName,
    mediaUrl,
    mediaType: firstMedia?.type || 'image',
    timestamp: p.createdAt.toISOString(),
    likes: p.likesCount,
    comments: p.commentsCount,
    shares: p.sharesCount,
    isLiked,
    isRegisteredAsIssue,
    issueProgress: issueProgress || 0,
    issueStatus: issueStatus || null,
  };
}

export function issueToAdminDTO(i: IIssueDoc, post: IPostDoc) {
  // Convert publicIds to full Cloudinary URLs
  const beforeImageUrl = i.beforeImages[0] 
    ? cloudinary.url(i.beforeImages[0], { resource_type: 'image', transformation: [{ width: 800, crop: 'scale' }] })
    : null;
  
  const afterImageUrl = i.afterImages[0]
    ? (i.afterImages[0].startsWith('http') 
        ? i.afterImages[0] 
        : cloudinary.url(i.afterImages[0], { resource_type: 'image', transformation: [{ width: 800, crop: 'scale' }] }))
    : null;

  return {
    id: String(i._id),
    postId: i.sourcePostId.toString(),
    postDescription: post.description,
    postCategory: post.category,
    postLocation: post.locationName,
    userInfo: {
      id: i.userSnapshot.id,
      name: i.userSnapshot.name,
      avatar: i.userSnapshot.avatar,
      email: i.userSnapshot.email,
      reportCount: i.userSnapshot.reportCount,
    },
    engagementScore: post.engagementScore,
    status: toTitle(i.status),
    reportedAt: post.createdAt.toISOString(),
    timeRequired: i.eta ? Math.ceil((i.eta.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
    deadline: i.deadlineAt ? i.deadlineAt.toISOString() : null,
    progress: i.progressPercent,
    beforeImage: beforeImageUrl,
    afterImage: afterImageUrl,
    deadlineExtended: i.extendedOnce,
  };
}

function toTitle(s: string) {
  return s.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
