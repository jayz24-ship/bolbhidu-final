import { verifyAccessToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
export async function requireAuth(req, res, next) {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
        if (!token)
            return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
        const payload = verifyAccessToken(token);
        const user = await User.findById(payload.sub);
        if (!user)
            return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid user' } });
        req.user = { id: String(user._id), role: user.role, doc: user };
        return next();
    }
    catch (e) {
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
    }
}
export function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Admin only' } });
    }
    return next();
}
//# sourceMappingURL=auth.js.map