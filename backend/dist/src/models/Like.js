import mongoose, { Schema } from 'mongoose';
const LikeSchema = new Schema({
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true });
LikeSchema.index({ postId: 1, userId: 1 }, { unique: true });
export const Like = mongoose.model('Like', LikeSchema);
//# sourceMappingURL=Like.js.map