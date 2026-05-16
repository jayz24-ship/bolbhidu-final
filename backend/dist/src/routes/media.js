import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { signature } from '../controllers/media.js';
const router = Router();
router.post('/signature', requireAuth, signature);
export default router;
//# sourceMappingURL=media.js.map