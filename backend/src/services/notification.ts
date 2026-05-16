import { Types } from 'mongoose';
import { Notification, NotificationType } from '../models/Notification.js';
import { getIO } from './socket.js';
import { ROOMS } from '../utils/constants.js';

interface CreateNotificationParams {
  userId: string | Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  socketEvent?: string; // Optional socket event name
}

/**
 * Create a notification in DB and emit socket event if user is online
 */
export async function createNotification(params: CreateNotificationParams) {
  const { userId, type, title, message, data, socketEvent } = params;
  
  console.log(`[Notification] 📨 Creating notification:`, {
    userId: userId.toString(),
    type,
    title: title.substring(0, 50),
    hasData: !!data,
    socketEvent
  });

  try {
    // Save notification to database
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      data,
      isRead: false,
    });

    console.log(`[Notification] ✅ Successfully created ${type} notification:`, {
      notificationId: String(notification._id),
      userId: userId.toString(),
      createdAt: notification.createdAt
    });

    // Also emit via socket for real-time delivery if user is online
    if (socketEvent) {
      try {
        const io = getIO();
        const userRoom = ROOMS.user(userId.toString());
        const socketPayload = {
          notificationId: String(notification._id),
          message,
          ...data,
        };
        
        console.log(`[Notification] 📡 Emitting ${socketEvent} to room ${userRoom}`);
        io.to(userRoom).emit(socketEvent, socketPayload);
        
        console.log(`[Notification] ✅ Socket event sent successfully`);
      } catch (socketError) {
        console.error(`[Notification] ❌ Socket emission failed:`, socketError);
      }
    } else {
      console.log(`[Notification] No socket event specified, skipping real-time notification`);
    }

    return notification;
  } catch (error) {
    console.error(`[Notification] ❌ Failed to create notification:`, error);
    throw error;
  }
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(userId: string) {
  return await Notification.find({ userId, isRead: false })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
}

/**
 * Get all notifications for a user (with pagination)
 */
export async function getNotifications(userId: string, limit = 20, skip = 0) {
  return await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string) {
  return await Notification.findByIdAndUpdate(
    notificationId,
    { isRead: true },
    { new: true }
  );
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string) {
  return await Notification.updateMany(
    { userId, isRead: false },
    { isRead: true }
  );
}

/**
 * Get unread count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return await Notification.countDocuments({ userId, isRead: false });
}

/**
 * Delete old read notifications (cleanup - optional)
 */
export async function cleanupOldNotifications(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const result = await Notification.deleteMany({
    isRead: true,
    createdAt: { $lt: cutoffDate },
  });
  
  console.log(`[Notification Cleanup] Deleted ${result.deletedCount} old notifications`);
  return result;
}
