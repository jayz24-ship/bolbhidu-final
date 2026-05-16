import mongoose, { Schema } from 'mongoose';
const IssueSchema = new Schema({
    sourcePostId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'rejected'], default: 'pending', index: true },
    priority: { type: Number, required: true, index: true },
    progressPercent: { type: Number, default: 0 },
    eta: { type: Date },
    deadlineAt: { type: Date },
    extendedOnce: { type: Boolean, default: false },
    beforeImages: { type: [String], default: [] },
    afterImages: { type: [String], default: [] },
    userSnapshot: {
        id: { type: String, required: true },
        name: { type: String, required: true },
        avatar: { type: String, required: true },
        email: { type: String, required: true },
        reportCount: { type: Number, required: true },
    },
}, { timestamps: true });
export const Issue = mongoose.model('Issue', IssueSchema);
//# sourceMappingURL=Issue.js.map