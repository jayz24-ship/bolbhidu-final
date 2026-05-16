import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
export function signAccessToken(payload) {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRE });
}
export function verifyAccessToken(token) {
    return jwt.verify(token, env.JWT_SECRET);
}
//# sourceMappingURL=jwt.js.map