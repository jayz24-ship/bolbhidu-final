import mongoose, { Schema } from 'mongoose';
const SavedPostSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
}, { timestamps: true });
// Compound index to ensure a user can only save a post once
SavedPostSchema.index({ userId: 1, postId: 1 }, { unique: true });
export const SavedPost = mongoose.model('SavedPost', SavedPostSchema);
//# sourceMappingURL=SavedPost.js.map