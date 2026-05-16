import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listNotifications, markNotificationAsRead, markAllNotificationsAsRead, getUnreadCountHandler } from '../controllers/notifications.js';

const router = Router();

router.use(requireAuth);

router.get('/', listNotifications);
router.get('/unread-count', getUnreadCountHandler);
router.post('/:id/read', markNotificationAsRead);
router.post('/mark-all-read', markAllNotificationsAsRead);

export default router;
