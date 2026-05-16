import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface ISavedPost {
  userId: Types.ObjectId;
  postId: Types.ObjectId;
  createdAt: Date;
}

export interface ISavedPostDoc extends ISavedPost, Document {}
export interface ISavedPostModel extends Model<ISavedPostDoc> {}

const SavedPostSchema = new Schema<ISavedPostDoc, ISavedPostModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  },
  { timestamps: true }
);

// Compound index to ensure a user can only save a post once
SavedPostSchema.index({ userId: 1, postId: 1 }, { unique: true });

export const SavedPost = mongoose.model<ISavedPostDoc, ISavedPostModel>('SavedPost', SavedPostSchema);
