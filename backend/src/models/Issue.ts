import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type IssueStatus = 'pending'|'in_progress'|'completed'|'rejected';

export interface IIssue {
  sourcePostId: Types.ObjectId;
  status: IssueStatus;
  priority: number;
  progressPercent: number;
  eta?: Date;
  deadlineAt?: Date;
  extendedOnce: boolean;
  beforeImages: string[];
  afterImages: string[];
  rejectedAt?: Date; // Timestamp when issue was rejected by admin
  userSnapshot: { id: string; name: string; avatar: string; email: string; reportCount: number };
  createdAt: Date;
  updatedAt: Date;
}

export interface IIssueDoc extends IIssue, Document {}
export interface IIssueModel extends Model<IIssueDoc> {}

const IssueSchema = new Schema<IIssueDoc, IIssueModel>(
  {
    sourcePostId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    status: { type: String, enum: ['pending','in_progress','completed','rejected'], default: 'pending', index: true },
    priority: { type: Number, required: true, index: true },
    progressPercent: { type: Number, default: 0 },
    eta: { type: Date },
    deadlineAt: { type: Date },
    extendedOnce: { type: Boolean, default: false },
    beforeImages: { type: [String], default: [] },
    afterImages: { type: [String], default: [] },
    rejectedAt: { type: Date }, // Timestamp when issue was rejected by admin
    userSnapshot: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      avatar: { type: String, default: '' },
      email: { type: String, required: true },
      reportCount: { type: Number, required: true },
    },
  },
  { timestamps: true }
);

export const Issue = mongoose.model<IIssueDoc, IIssueModel>('Issue', IssueSchema);
