import { Request, Response } from 'express';
import mongoose from 'mongoose';
import dayjs from 'dayjs';
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
import { GeospatialHealthCheck, CoordinateValidator } from '../utils/geospatial.js';

export async function createPost(req: Request, res: Response) {
  const authUser: any = (req as any).user?.doc;
  if (!authUser) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
  if (authUser.postBanUntil && new Date() < new Date(authUser.postBanUntil)) {
    return res.status(403).json({ error: { code: 'BANNED', message: 'Posting temporarily suspended', details: { expiresAt: authUser.postBanUntil } } });
  }
  const { description, category, location, lat, lng, media } = req.body || {};
  if (!description || !category || !location || typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing fields' } });
  }
  
  // Comprehensive coordinate validation using utility
  const validation = CoordinateValidator.validate(lat, lng);
  
  if (!validation.isValid) {
    return res.status(400).json({ 
      error: { 
        code: 'INVALID_COORDINATES', 
        message: validation.errors.join('. '),
        details: validation.errors
      } 
    });
  }
  
  // Log warnings for suspicious coordinates
  if (validation.isSuspicious) {
    console.warn(`[Create Post] Suspicious coordinates for "${description}": [${lng}, ${lat}] - ${validation.warnings.join(', ')}`);
  }
  console.log(`[Create Post] Creating post with location: ${location} [${lng}, ${lat}]`);
  
  const post = await Post.create({
    authorId: authUser._id,
    description,
    category,
    locationName: location,
    location: { type: 'Point', coordinates: [lng, lat] },
    media: (media || []).map((m: any) => ({ publicId: m.publicId, type: m.type })),
    aiVerdict: 'pending',
  });
  
  console.log(`[Create Post] Post created with ID: ${post._id}, location saved as:`, post.location);

  // emit feed.post.created to nearby users optionally – skipping geo room; emit to author room
  const io = getIO();
  io.to(ROOMS.user(String(authUser._id))).emit(EVENTS.FEED_POST_CREATED, { postId: String(post._id) });

  enqueueAndValidatePost(post);
  return res.status(201).json({ id: String(post._id), aiVerdict: 'pending' });
}

export async function getFeed(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  const { page, limit, skip } = getPagination(req.query, { page: 1, limit: 10 });
  const lat = parseFloat(String(req.query.lat));
  const lng = parseFloat(String(req.query.lng));
  const radiusKm = parseFloat(String(req.query.radiusKm || env.FEED_RADIUS_KM || '25'));

  const baseQuery: any = {
    aiVerdict: 'accepted',
  };

  let items: any[];
  let total: number;

  // Smart geospatial filtering with robust fallbacks
  const hasValidCoordinates = !isNaN(lat) && !isNaN(lng) && 
                              lat >= -90 && lat <= 90 && 
                              lng >= -180 && lng <= 180;

  if (hasValidCoordinates) {
    try {
      console.log(`[Feed] Using geospatial query: lat=${lat}, lng=${lng}, radius=${radiusKm}km`);
      
      // Debug: Check what posts exist first
      const allAcceptedPosts = await Post.find(baseQuery).select('_id description locationName location authorId').limit(5);
      console.log(`[Feed] Sample of ${allAcceptedPosts.length} accepted posts:`);
      allAcceptedPosts.forEach((p, i) => {
        console.log(`  ${i+1}. "${p.description}" at ${p.locationName} - coords: [${p.location?.coordinates}] by ${p.authorId}`);
      });
      
      // Geospatial query with $near (sorted by distance)
      const geoQuery = {
        ...baseQuery,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat] // GeoJSON: [longitude, latitude]
            },
            $maxDistance: radiusKm * 1000 // Convert km to meters
          }
        }
      };

      console.log(`[Feed] Executing geospatial query:`, JSON.stringify(geoQuery, null, 2));

      // Get items using geospatial query (already sorted by distance)
      items = await Post.find(geoQuery).skip(skip).limit(limit);
      
      // For count, use $geoWithin (doesn't require sorting)
      const countQuery = {
        ...baseQuery,
        location: {
          $geoWithin: {
            $centerSphere: [
              [lng, lat], 
              radiusKm / 6378.1 // Convert km to radians (Earth radius ≈ 6378.1 km)
            ]
          }
        }
      };
      
      total = await Post.countDocuments(countQuery);
      
      console.log(`[Feed] Geospatial query found ${items.length} posts within ${radiusKm}km (${total} total)`);
      
      // Debug: Show what posts were found
      if (items.length > 0) {
        console.log(`[Feed] Found posts:`);
        items.forEach((p, i) => {
          const distance = p.location?.coordinates ? 
            Math.sqrt(Math.pow(p.location.coordinates[0] - lng, 2) + Math.pow(p.location.coordinates[1] - lat, 2)) * 111 // rough km conversion
            : 'unknown';
          console.log(`  ${i+1}. "${p.description}" - ~${distance}km away`);
        });
      } else {
        console.log(`[Feed] No posts found within ${radiusKm}km of [${lng}, ${lat}]`);
      }
      
    } catch (geoError: any) {
      console.error(`[Feed] Geospatial query failed:`, geoError.message);
      console.log(`[Feed] Falling back to global feed`);
      
      // Fallback to global feed if geospatial fails
      [items, total] = await Promise.all([
        Post.find(baseQuery).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Post.countDocuments(baseQuery),
      ]);
    }
  } else {
    console.log(`[Feed] No valid coordinates provided, showing global feed`);
    console.log(`[Feed] Received: lat=${lat}, lng=${lng} (isNaN: lat=${isNaN(lat)}, lng=${isNaN(lng)})`);
    
    // Global feed when no valid coordinates
    [items, total] = await Promise.all([
      Post.find(baseQuery).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Post.countDocuments(baseQuery),
    ]);
  }

  const authorIds = items.map((p) => p.authorId);
  const authors = await User.find({ _id: { $in: authorIds } });
  const authorsMap = new Map(authors.map((a) => [String(a._id), a]));

  const likedSet = new Set<string>();
  if (userId) {
    const likes = await Like.find({ userId: new mongoose.Types.ObjectId(userId), postId: { $in: items.map((i) => i._id) } });
    likes.forEach((l) => likedSet.add(l.postId.toString()));
  }

  // Fetch issue data for escalated posts
  const { Issue } = await import('../models/Issue.js');
  const postIds = items.map(p => p._id);
  const issues = await Issue.find({ sourcePostId: { $in: postIds } });
  const issuesMap = new Map(issues.map(i => [i.sourcePostId.toString(), i]));

  // Filter out posts with rejected issues older than 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const filteredItems = items.filter((p) => {
    const issue = issuesMap.get(String(p._id));
    // Exclude if issue is rejected and was rejected more than 24 hours ago
    if (issue?.status === 'rejected' && issue.rejectedAt && issue.rejectedAt < twentyFourHoursAgo) {
      console.log(`[Feed] Hiding post ${p._id} - issue rejected ${issue.rejectedAt.toISOString()} (>24h ago)`);
      return false;
    }
    return true;
  });

  // Check registration as issue via isEscalated
  const dtos = filteredItems.map((p) => {
    const author = authorsMap.get(p.authorId.toString());
    if (!author) return null;
    const issue = issuesMap.get(String(p._id));
    return postToFeedDTO(
      p, 
      author, 
      likedSet.has(String(p._id)), 
      !!p.isEscalated,
      issue?.progressPercent,
      issue?.status
    );
  }).filter((dto): dto is NonNullable<typeof dto> => dto !== null);

  const totalPages = Math.ceil(total / limit);
  res.json({ items: dtos, hasMore: page < totalPages, page, totalPages });
}

export async function getPost(req: Request, res: Response) {
  const p = await Post.findById(req.params.id);
  if (!p) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
  return res.json(p);
}

export async function likePost(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  const userName = (req as any).user?.doc?.name || 'Someone';
  const postId = req.params.id;
  if (!userId) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
  
  // Get post to find author
  const post = await Post.findById(postId);
  if (!post) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
  
  try {
    await Like.updateOne({ postId, userId }, { $setOnInsert: { postId, userId } }, { upsert: true });
  } catch {}
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

export async function unlikePost(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  const postId = req.params.id;
  if (!userId) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
  await Like.deleteOne({ postId, userId });
  const likes = await Like.countDocuments({ postId });
  await Post.findByIdAndUpdate(postId, { likesCount: likes });
  await maybeEscalate(postId);
  const io = getIO();
  io.to(ROOMS.post(postId)).emit(EVENTS.POST_LIKE_UPDATED, { postId, likes });
  return res.json({ success: true });
}

export async function getComments(req: Request, res: Response) {
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

export async function addComment(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  const userName = (req as any).user?.doc?.name || 'Someone';
  const postId = req.params.id;
  const { content } = req.body || {};
  if (!userId) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
  if (!content) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'content required' } });
  
  // Get post to find author
  const post = await Post.findById(postId);
  if (!post) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
  
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

export async function sharePost(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  const userName = (req as any).user?.doc?.name || 'Someone';
  const postId = req.params.id;
  if (!userId) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
  
  const post = await Post.findById(postId);
  if (!post) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
  
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

export async function savePost(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  const postId = req.params.id;
  if (!userId) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
  
  await SavedPost.findOneAndUpdate(
    { userId, postId },
    { userId, postId },
    { upsert: true }
  );
  
  return res.json({ success: true, saved: true });
}

export async function unsavePost(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  const postId = req.params.id;
  if (!userId) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
  
  await SavedPost.deleteOne({ userId, postId });
  
  return res.json({ success: true, saved: false });
}

export async function deletePost(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  const postId = req.params.id;
  
  if (!userId) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
  
  const post = await Post.findById(postId);
  if (!post) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
  
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

export async function getSavedPosts(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
  
  const { page, limit, skip } = getPagination(req.query, { page: 1, limit: 20 });
  
  const savedPosts = await SavedPost.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit);
  const postIds = savedPosts.map(sp => sp.postId);
  
  const posts = await Post.find({ _id: { $in: postIds } });
  const authorIds = posts.map(p => p.authorId);
  const authors = await User.find({ _id: { $in: authorIds } });
  const authorsMap = new Map(authors.map(a => [String(a._id), a]));
  
  const likedSet = new Set<string>();
  const likes = await Like.find({ userId: new mongoose.Types.ObjectId(userId), postId: { $in: postIds } });
  likes.forEach(l => likedSet.add(l.postId.toString()));
  
  const dtos = posts.map(p => {
    const author = authorsMap.get(p.authorId.toString());
    if (!author) return null;
    return postToFeedDTO(p, author, likedSet.has(String(p._id)), !!p.isEscalated);
  }).filter((dto): dto is NonNullable<typeof dto> => dto !== null);
  
  const total = await SavedPost.countDocuments({ userId });
  const totalPages = Math.ceil(total / limit);
  
  return res.json({ items: dtos, hasMore: page < totalPages, page, totalPages });
}

export async function getMyPosts(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
  
  const { page, limit, skip } = getPagination(req.query, { page: 1, limit: 20 });
  
  // Get ALL user's posts regardless of AI status
  const posts = await Post.find({ authorId: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit);
  
  // Get user info
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
  
  const likedSet = new Set<string>();
  const likes = await Like.find({ userId: new mongoose.Types.ObjectId(userId), postId: { $in: posts.map(p => p._id) } });
  likes.forEach(l => likedSet.add(l.postId.toString()));
  
  const dtos = posts.map(p => {
    const dto = postToFeedDTO(p, user, likedSet.has(String(p._id)), !!p.isEscalated);
    // Add AI status info for user's own posts
    return {
      ...dto,
      aiStatus: p.aiVerdict,
      aiScore: p.aiScore,
      aiReasons: p.aiReasons,
    };
  });
  
  const total = await Post.countDocuments({ authorId: userId });
  const totalPages = Math.ceil(total / limit);
  
  return res.json({ items: dtos, hasMore: page < totalPages, page, totalPages });
}

// Temporary endpoint to fix posts with [0,0] coordinates
export async function fixInvalidCoordinates(req: Request, res: Response) {
  const { lat, lng } = req.body || {};
  
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'lat and lng required' } });
  }
  
  // Update all posts with [0,0] coordinates to the provided coordinates
  const result = await Post.updateMany(
    { 'location.coordinates': [0, 0] },
    { 
      $set: { 
        'location.coordinates': [lng, lat],
        'location.type': 'Point'
      } 
    }
  );
  
  console.log(`[Fix Coordinates] Updated ${result.modifiedCount} posts from [0,0] to [${lng}, ${lat}]`);
  
  return res.json({ 
    success: true, 
    message: `Updated ${result.modifiedCount} posts with proper coordinates`,
    modifiedCount: result.modifiedCount 
  });
}

// Debug endpoint to check post AI status
export async function debugPost(req: Request, res: Response) {
  const postId = req.params.id;
  
  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
    }
    
    const timeSinceCreation = Date.now() - post.createdAt.getTime();
    const isStuck = post.aiVerdict === 'pending' && timeSinceCreation > 60000; // More than 1 minute
    
    return res.json({
      postId: String(post._id),
      description: post.description.substring(0, 100) + '...',
      aiStatus: {
        verdict: post.aiVerdict,
        score: post.aiScore || null,
        reasons: post.aiReasons || [],
      },
      timing: {
        createdAt: post.createdAt.toISOString(),
        timeSinceCreation: `${Math.round(timeSinceCreation / 1000)}s`,
        isStuck,
      },
      author: {
        id: String(post.authorId),
      },
      debug: {
        hasMedia: post.media.length > 0,
        mediaTypes: post.media.map(m => m.type),
        category: post.category,
        location: post.locationName,
      }
    });
    
  } catch (error: any) {
    console.error('[Debug] Error getting post debug info:', error);
    return res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get post debug info' } 
    });
  }
}

// Geospatial system health check endpoint
export async function healthCheck(req: Request, res: Response) {
  try {
    // Run all health checks
    const [indexCheck, coordCheck, queryTest] = await Promise.all([
      GeospatialHealthCheck.verifyIndex(),
      GeospatialHealthCheck.findInvalidCoordinates(),
      GeospatialHealthCheck.testGeospatialQuery(18.7503812, 73.8543919, 25)
    ]);
    
    const isHealthy = indexCheck.success && coordCheck.success && queryTest.success;
    
    const healthReport = {
      overall: isHealthy ? 'HEALTHY' : 'ISSUES_FOUND',
      timestamp: new Date().toISOString(),
      checks: {
        geospatialIndex: {
          status: indexCheck.success ? 'PASS' : 'FAIL',
          message: indexCheck.message,
          details: indexCheck.details
        },
        coordinateData: {
          status: coordCheck.success ? 'PASS' : 'FAIL',
          summary: coordCheck.summary,
          invalidCount: coordCheck.invalidPosts?.length || 0,
          suspiciousCount: coordCheck.suspiciousPosts?.length || 0
        },
        queryPerformance: {
          status: queryTest.success ? 'PASS' : 'FAIL',
          message: queryTest.message,
          queryTime: queryTest.queryTime,
          resultsFound: queryTest.resultsCount
        }
      },
      recommendations: []
    };
    
    // Add recommendations based on findings
    if (!indexCheck.success) {
      healthReport.recommendations.push('Recreate 2dsphere index on location field');
    }
    
    if (coordCheck.invalidPosts && coordCheck.invalidPosts.length > 0) {
      healthReport.recommendations.push(`Fix ${coordCheck.invalidPosts.length} posts with invalid coordinates`);
    }
    
    if (coordCheck.suspiciousPosts && coordCheck.suspiciousPosts.length > 0) {
      healthReport.recommendations.push(`Review ${coordCheck.suspiciousPosts.length} posts with suspicious coordinates`);
    }
    
    if (queryTest.queryTime > 100) {
      healthReport.recommendations.push('Consider optimizing geospatial queries - response time is slow');
    }
    
    return res.json(healthReport);
    
  } catch (error: any) {
    return res.status(500).json({
      overall: 'ERROR',
      timestamp: new Date().toISOString(),
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: error.message
      }
    });
  }
}

export async function getTrendingIssues(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
  
  const { page, limit, skip } = getPagination(req.query, { page: 1, limit: 20 });
  const lat = parseFloat(String(req.query.lat));
  const lng = parseFloat(String(req.query.lng));
  const radiusKm = parseFloat(String(req.query.radiusKm || env.FEED_RADIUS_KM || '25'));
  const timeframe = String(req.query.timeframe || '7d'); // 1d, 7d, 30d
  
  // Calculate date threshold based on timeframe
  const timeframeMap: { [key: string]: number } = {
    '1d': 1,
    '7d': 7,
    '30d': 30
  };
  const daysBack = timeframeMap[timeframe] || 7;
  const dateThreshold = dayjs().subtract(daysBack, 'day').toDate();
  
  const baseQuery: any = {
    aiVerdict: 'accepted',
    createdAt: { $gte: dateThreshold }, // Only recent posts
    // Trending posts should have some engagement
    $or: [
      { likesCount: { $gte: 1 } },
      { commentsCount: { $gte: 1 } },
      { sharesCount: { $gte: 1 } }
    ]
  };
  
  const hasValidCoordinates = !isNaN(lat) && !isNaN(lng) && 
                              lat >= -90 && lat <= 90 && 
                              lng >= -180 && lng <= 180;

  let items: any[];
  let total: number;

  if (hasValidCoordinates) {
    try {
      console.log(`[Trending] Using geospatial query: lat=${lat}, lng=${lng}, radius=${radiusKm}km, timeframe=${timeframe}`);
      
      // Geospatial query with trending logic
      const geoQuery = {
        ...baseQuery,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat] // GeoJSON: [longitude, latitude]
            },
            $maxDistance: radiusKm * 1000 // Convert km to meters
          }
        }
      };

      // Get trending posts sorted by engagement score (distance is secondary)
      items = await Post.find(geoQuery)
        .sort({ 
          engagementScore: -1, // Primary: highest engagement first
          createdAt: -1        // Secondary: newest first for same engagement
        })
        .skip(skip)
        .limit(limit);
      
      // For count, use $geoWithin
      const countQuery = {
        ...baseQuery,
        location: {
          $geoWithin: {
            $centerSphere: [
              [lng, lat], 
              radiusKm / 6378.1 // Convert km to radians
            ]
          }
        }
      };
      
      total = await Post.countDocuments(countQuery);
      
      console.log(`[Trending] Found ${items.length} trending posts within ${radiusKm}km (${total} total)`);
      
    } catch (geoError: any) {
      console.error(`[Trending] Geospatial query failed:`, geoError.message);
      console.log(`[Trending] Falling back to global trending`);
      
      // Fallback to global trending
      [items, total] = await Promise.all([
        Post.find(baseQuery)
          .sort({ engagementScore: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Post.countDocuments(baseQuery),
      ]);
    }
  } else {
    console.log(`[Trending] No valid coordinates provided, showing global trending`);
    
    // Global trending when no valid coordinates
    [items, total] = await Promise.all([
      Post.find(baseQuery)
        .sort({ engagementScore: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Post.countDocuments(baseQuery),
    ]);
  }
  
  // Get author information and build DTOs
  const authorIds = items.map((p) => p.authorId);
  const authors = await User.find({ _id: { $in: authorIds } });
  const authorsMap = new Map(authors.map((a) => [String(a._id), a]));

  const likedSet = new Set<string>();
  if (userId) {
    const likes = await Like.find({ 
      userId: new mongoose.Types.ObjectId(userId), 
      postId: { $in: items.map((i) => i._id) } 
    });
    likes.forEach((l) => likedSet.add(l.postId.toString()));
  }

  // Fetch issue data for escalated posts
  const { Issue } = await import('../models/Issue.js');
  const postIds = items.map(p => p._id);
  const issues = await Issue.find({ sourcePostId: { $in: postIds } });
  const issuesMap = new Map(issues.map(i => [i.sourcePostId.toString(), i]));

  // Filter out posts with rejected issues older than 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const filteredItems = items.filter((p) => {
    const issue = issuesMap.get(String(p._id));
    // Exclude if issue is rejected and was rejected more than 24 hours ago
    if (issue?.status === 'rejected' && issue.rejectedAt && issue.rejectedAt < twentyFourHoursAgo) {
      console.log(`[Trending] Hiding post ${p._id} - issue rejected ${issue.rejectedAt.toISOString()} (>24h ago)`);
      return false;
    }
    return true;
  });

  const dtos = filteredItems.map((p) => {
    const author = authorsMap.get(p.authorId.toString());
    if (!author) return null;
    const issue = issuesMap.get(String(p._id));
    
    // Add trending-specific metadata
    const baseDto = postToFeedDTO(
      p, 
      author, 
      likedSet.has(String(p._id)), 
      !!p.isEscalated,
      issue?.progressPercent,
      issue?.status
    );
    
    return {
      ...baseDto,
      engagementScore: p.engagementScore,
      trendingRank: items.indexOf(p) + 1 + skip, // Position in trending list
      timeframe,
      // Add distance info if geospatial query was used
      ...(hasValidCoordinates && p.location?.coordinates ? {
        distance: CoordinateValidator.calculateDistance(
          lat, lng,
          p.location.coordinates[1], // lat from DB
          p.location.coordinates[0]  // lng from DB
        ).toFixed(1) + 'km'
      } : {})
    };
  }).filter((dto): dto is NonNullable<typeof dto> => dto !== null);

  const totalPages = Math.ceil(total / limit);
  
  res.json({ 
    items: dtos, 
    hasMore: page < totalPages, 
    page, 
    totalPages,
    meta: {
      timeframe,
      radiusKm: hasValidCoordinates ? radiusKm : null,
      coordinates: hasValidCoordinates ? { lat, lng } : null,
      totalTrendingPosts: total
    }
  });
}

export async function getTrendingCategories(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
  
  const lat = parseFloat(String(req.query.lat));
  const lng = parseFloat(String(req.query.lng));
  const radiusKm = parseFloat(String(req.query.radiusKm || env.FEED_RADIUS_KM || '25'));
  const timeframe = String(req.query.timeframe || '7d');
  
  const timeframeMap: { [key: string]: number } = { '1d': 1, '7d': 7, '30d': 30 };
  const daysBack = timeframeMap[timeframe] || 7;
  const dateThreshold = dayjs().subtract(daysBack, 'day').toDate();
  
  const baseMatchQuery: any = {
    aiVerdict: 'accepted',
    createdAt: { $gte: dateThreshold },
    $or: [
      { likesCount: { $gte: 1 } },
      { commentsCount: { $gte: 1 } },
      { sharesCount: { $gte: 1 } }
    ]
  };
  
  const hasValidCoordinates = !isNaN(lat) && !isNaN(lng) && 
                              lat >= -90 && lat <= 90 && 
                              lng >= -180 && lng <= 180;

  let aggregationPipeline: any[];
  
  if (hasValidCoordinates) {
    // Add geospatial filtering to aggregation
    aggregationPipeline = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distance',
          maxDistance: radiusKm * 1000,
          spherical: true,
          query: baseMatchQuery
        }
      }
    ];
  } else {
    // Global aggregation
    aggregationPipeline = [
      { $match: baseMatchQuery }
    ];
  }
  
  // Add category grouping and trending calculation
  aggregationPipeline.push(
    {
      $group: {
        _id: '$category',
        totalPosts: { $sum: 1 },
        totalLikes: { $sum: '$likesCount' },
        totalComments: { $sum: '$commentsCount' },
        totalShares: { $sum: '$sharesCount' },
        totalEngagement: { $sum: '$engagementScore' },
        avgEngagement: { $avg: '$engagementScore' },
        latestPost: { $max: '$createdAt' }
      }
    },
    {
      $addFields: {
        category: '$_id',
        trendingScore: {
          $add: [
            '$totalEngagement',
            { $multiply: ['$totalPosts', 2] } // Bonus for volume
          ]
        }
      }
    },
    {
      $sort: { trendingScore: -1 }
    },
    {
      $limit: 6 // All categories: roads, water, sanitation, electricity, safety, other
    }
  );
  
  try {
    const categoryStats = await Post.aggregate(aggregationPipeline);
    
    const formattedStats = categoryStats.map(stat => ({
      category: stat.category,
      displayName: getCategoryDisplayName(stat.category),
      stats: {
        totalPosts: stat.totalPosts,
        totalLikes: stat.totalLikes,
        totalComments: stat.totalComments,
        totalShares: stat.totalShares,
        totalEngagement: stat.totalEngagement,
        avgEngagement: parseFloat(stat.avgEngagement?.toFixed(1) || '0'),
        trendingScore: stat.trendingScore
      },
      latestActivity: stat.latestPost,
      trend: getTrendIndicator(stat.trendingScore, stat.totalPosts)
    }));
    
    res.json({
      categories: formattedStats,
      meta: {
        timeframe,
        radiusKm: hasValidCoordinates ? radiusKm : null,
        coordinates: hasValidCoordinates ? { lat, lng } : null,
        totalCategories: formattedStats.length
      }
    });
    
  } catch (error: any) {
    console.error('[Trending Categories] Error:', error);
    return res.status(500).json({
      error: {
        code: 'TRENDING_CATEGORIES_ERROR',
        message: 'Failed to fetch trending categories'
      }
    });
  }
}

// Helper function to get category display names
function getCategoryDisplayName(category: string): string {
  const displayNames: { [key: string]: string } = {
    'roads': 'Roads & Traffic',
    'water': 'Water Supply',
    'sanitation': 'Sanitation & Waste',
    'electricity': 'Electricity & Power',
    'safety': 'Safety & Security',
    'other': 'Other Issues'
  };
  return displayNames[category] || category;
}

// Helper function to determine trend indicator
function getTrendIndicator(trendingScore: number, totalPosts: number): string {
  if (trendingScore > 50 && totalPosts > 5) return 'hot';
  if (trendingScore > 20 && totalPosts > 2) return 'rising';
  if (totalPosts > 0) return 'stable';
  return 'quiet';
}
