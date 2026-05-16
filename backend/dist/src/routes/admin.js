import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { listIssues, getIssue, validateIssue, updateIssueProgress, extendDeadline, completeIssue, uploadIssueImages, markInvalid } from '../controllers/admin.js';
const router = Router();
router.use(requireAuth, requireAdmin);
router.get('/issues', listIssues);
router.get('/issues/:id', getIssue);
router.post('/issues/:id/validate', validateIssue);
router.post('/issues/:id/progress', updateIssueProgress);
router.post('/issues/:id/extend-deadline', extendDeadline);
router.post('/issues/:id/complete', completeIssue);
router.post('/issues/:id/images', uploadIssueImages);
router.post('/issues/:id/invalid', markInvalid);
export default router;
//# sourceMappingURL=admin.js.map