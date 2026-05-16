import { Router } from 'express';
import auth from './auth.js';
import media from './media.js';
import posts from './posts.js';
import admin from './admin.js';
import issues from './issues.js';
import notifications from './notifications.js';
import geocoding from './geocoding.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true }));
router.use('/auth', auth);
router.use('/media', media);
router.use('/posts', posts);
router.use('/admin', admin);
router.use('/issues', issues);
router.use('/notifications', notifications);
router.use('/geocoding', geocoding);

export default router;
