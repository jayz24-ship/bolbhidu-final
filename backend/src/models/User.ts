import mongoose, { Document, Model, Schema } from 'mongoose';

export type UserRole = 'user' | 'admin';

export interface IUser {
  name: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  role: UserRole;
  googleId?: string;
  reportCount: number;
  postBanUntil?: Date | null;
  isBlocked?: boolean;
  blockExpiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // auth local
  passwordHash?: string;
  isCurrentlyBlocked(): boolean;
}

export interface IUserDoc extends IUser, Document {}
export interface IUserModel extends Model<IUserDoc> {}

const UserSchema = new Schema<IUserDoc, IUserModel>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    avatarUrl: { type: String },
    bio: { type: String },
    location: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    googleId: { type: String },
    reportCount: { type: Number, default: 0 },
    postBanUntil: { type: Date, default: null },
    isBlocked: { type: Boolean, default: false },
    blockExpiresAt: { type: Date, default: null },
    passwordHash: { type: String },
  },
  { timestamps: true }
);

UserSchema.methods.isCurrentlyBlocked = function (): boolean {
  const now = new Date();
  if (this.isBlocked && this.blockExpiresAt && now < this.blockExpiresAt) return true;
  if (this.postBanUntil && now < this.postBanUntil) return true;
  return false;
};

export const User = mongoose.model<IUserDoc, IUserModel>('User', UserSchema);
