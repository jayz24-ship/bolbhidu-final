import mongoose, { Schema } from 'mongoose';
const NotificationSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
        type: String,
        enum: [
            'post_liked',
            'post_commented',
            'post_shared',
            'post_escalated',
            'post_ai_accepted',
            'post_ai_rejected',
            'issue_validated',
            'issue_updated',
            'issue_completed',
            'issue_rejected',
            'user_enforcement'
        ],
        required: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    isRead: { type: Boolean, default: false, index: true },
}, { timestamps: true });
// Index for efficient querying
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
export const Notification = mongoose.model('Notification', NotificationSchema);
//# sourceMappingURL=Notification.js.map