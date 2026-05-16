import mongoose, { Schema } from 'mongoose';
const UserSchema = new Schema({
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
}, { timestamps: true });
UserSchema.methods.isCurrentlyBlocked = function () {
    const now = new Date();
    if (this.isBlocked && this.blockExpiresAt && now < this.blockExpiresAt)
        return true;
    if (this.postBanUntil && now < this.postBanUntil)
        return true;
    return false;
};
export const User = mongoose.model('User', UserSchema);
//# sourceMappingURL=User.js.map