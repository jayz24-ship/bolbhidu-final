import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type Category = 'roads'|'water'|'sanitation'|'electricity'|'safety'|'other';
export type MediaType = 'image'|'video';
export type AIVerdict = 'pending'|'accepted'|'rejected';

export interface IPost {
  authorId: Types.ObjectId;
  description: string;
  category: Category;
  locationName: string;
  location: { type: 'Point'; coordinates: [number, number] }; // [lng, lat]
  media: Array<{ publicId: string; type: MediaType }>;
  aiVerdict: AIVerdict;
  aiScore?: number;
  aiReasons?: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  engagementScore: number;
  isEscalated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPostDoc extends IPost, Document {}
export interface IPostModel extends Model<IPostDoc> {}

const MediaSchema = new Schema<{ publicId: string; type: MediaType }>(
  {
    publicId: { type: String, required: true },
    type: { type: String, enum: ['image','video'], required: true },
  },
  { _id: false }
);

const PostSchema = new Schema<IPostDoc, IPostModel>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    description: { type: String, required: true },
    category: { type: String, enum: ['roads','water','sanitation','electricity','safety','other'], required: true },
    locationName: { type: String, required: true },
    location: {
      type: { type: String, enum: ['Point'], required: true, default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    media: { type: [MediaSchema], default: [] },
    aiVerdict: { type: String, enum: ['pending','accepted','rejected'], default: 'pending', index: true },
    aiScore: { type: Number },
    aiReasons: { type: [String], default: [] },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    engagementScore: { type: Number, default: 0, index: true },
    isEscalated: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

PostSchema.index({ location: '2dsphere' } as any);
PostSchema.index({ isEscalated: 1, createdAt: -1 });

export const Post = mongoose.model<IPostDoc, IPostModel>('Post', PostSchema);
