import { Notification } from '../models/Notification.js';
import { getIO } from './socket.js';
import { ROOMS } from '../utils/constants.js';
/**
 * Create a notification in DB and emit socket event if user is online
 */
export async function createNotification(params) {
    const { userId, type, title, message, data, socketEvent } = params;
    // Save notification to database
    const notification = await Notification.create({
        userId,
        type,
        title,
        message,
        data,
        isRead: false,
    });
    console.log(`[Notification] Created ${type} notification for user ${userId}`);
    // Also emit via socket for real-time delivery if user is online
    if (socketEvent) {
        const io = getIO();
        io.to(ROOMS.user(userId.toString())).emit(socketEvent, {
            notificationId: String(notification._id),
            message,
            ...data,
        });
    }
    return notification;
}
/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(userId) {
    return await Notification.find({ userId, isRead: false })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
}
/**
 * Get all notifications for a user (with pagination)
 */
export async function getNotifications(userId, limit = 20, skip = 0) {
    return await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();
}
/**
 * Mark notification as read
 */
export async function markAsRead(notificationId) {
    return await Notification.findByIdAndUpdate(notificationId, { isRead: true }, { new: true });
}
/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId) {
    return await Notification.updateMany({ userId, isRead: false }, { isRead: true });
}
/**
 * Get unread count for a user
 */
export async function getUnreadCount(userId) {
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
//# sourceMappingURL=notification.js.map