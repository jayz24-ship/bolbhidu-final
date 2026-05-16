import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface ILike {
  postId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILikeDoc extends ILike, Document {}
export interface ILikeModel extends Model<ILikeDoc> {}

const LikeSchema = new Schema<ILikeDoc, ILikeModel>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

LikeSchema.index({ postId: 1, userId: 1 }, { unique: true });

export const Like = mongoose.model<ILikeDoc, ILikeModel>('Like', LikeSchema);
