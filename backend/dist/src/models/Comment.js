import mongoose, { Schema } from 'mongoose';
const CommentSchema = new Schema({
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, required: true },
}, { timestamps: true });
export const Comment = mongoose.model('Comment', CommentSchema);
//# sourceMappingURL=Comment.js.map