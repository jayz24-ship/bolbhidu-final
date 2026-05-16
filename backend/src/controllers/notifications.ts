import { Request, Response } from 'express';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../services/notification.js';

export async function listNotifications(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });

  const limit = parseInt(String(req.query.limit || '20'));
  const skip = parseInt(String(req.query.skip || '0'));

  const notifications = await getNotifications(userId, limit, skip);
  const unreadCount = await getUnreadCount(userId);

  res.json({
    notifications: notifications.map(n => ({
      id: String(n._id),
      type: n.type,
      title: n.title,
      message: n.message,
      data: n.data,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  });
}

export async function markNotificationAsRead(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });

  const notificationId = req.params.id;
  const notification = await markAsRead(notificationId);

  if (!notification) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Notification not found' } });
  }

  res.json({ success: true });
}

export async function markAllNotificationsAsRead(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });

  await markAllAsRead(userId);

  res.json({ success: true });
}

export async function getUnreadCountHandler(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });

  const count = await getUnreadCount(userId);

  res.json({ unreadCount: count });
}
