import { Router } from 'express';
import { getIssuePublic, getMyIssues } from '../controllers/issues.js';
import { requireAuth } from '../middleware/auth.js';
const router = Router();
router.get('/my-issues', requireAuth, getMyIssues);
router.get('/:id/public', getIssuePublic);
export default router;
//# sourceMappingURL=issues.js.map