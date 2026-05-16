import mongoose, { Schema } from 'mongoose';
const MediaSchema = new Schema({
    publicId: { type: String, required: true },
    type: { type: String, enum: ['image', 'video'], required: true },
}, { _id: false });
const PostSchema = new Schema({
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    description: { type: String, required: true },
    category: { type: String, enum: ['roads', 'water', 'sanitation', 'electricity', 'safety', 'other'], required: true },
    locationName: { type: String, required: true },
    location: {
        type: { type: String, enum: ['Point'], required: true, default: 'Point' },
        coordinates: { type: [Number], required: true },
    },
    media: { type: [MediaSchema], default: [] },
    aiVerdict: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending', index: true },
    aiScore: { type: Number },
    aiReasons: { type: [String], default: [] },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    engagementScore: { type: Number, default: 0, index: true },
    isEscalated: { type: Boolean, default: false, index: true },
}, { timestamps: true });
PostSchema.index({ location: '2dsphere' });
PostSchema.index({ isEscalated: 1, createdAt: -1 });
export const Post = mongoose.model('Post', PostSchema);
//# sourceMappingURL=Post.js.map