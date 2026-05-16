import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createPostLimiter, commentLimiter, likeLimiter } from '../middleware/rateLimit.js';
import { createPost, getFeed, getPost, likePost, unlikePost, getComments, addComment, sharePost, savePost, unsavePost, getSavedPosts, deletePost } from '../controllers/posts.js';
const router = Router();
router.post('/', requireAuth, createPostLimiter, createPost);
router.get('/feed', requireAuth, getFeed);
router.get('/saved', requireAuth, getSavedPosts);
router.get('/:id', requireAuth, getPost);
router.delete('/:id', requireAuth, deletePost);
router.post('/:id/like', requireAuth, likeLimiter, likePost);
router.delete('/:id/like', requireAuth, likeLimiter, unlikePost);
router.get('/:id/comments', requireAuth, getComments);
router.post('/:id/comments', requireAuth, commentLimiter, addComment);
router.post('/:id/share', requireAuth, sharePost);
router.post('/:id/save', requireAuth, savePost);
router.delete('/:id/save', requireAuth, unsavePost);
export default router;
//# sourceMappingURL=posts.js.map