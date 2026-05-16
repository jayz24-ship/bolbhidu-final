import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IComment {
  postId: Types.ObjectId;
  authorId: Types.ObjectId;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICommentDoc extends IComment, Document {}
export interface ICommentModel extends Model<ICommentDoc> {}

const CommentSchema = new Schema<ICommentDoc, ICommentModel>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

export const Comment = mongoose.model<ICommentDoc, ICommentModel>('Comment', CommentSchema);
