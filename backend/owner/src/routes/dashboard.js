import { Router } from 'express';
import { requireAuth, requireOwner } from '../middleware/auth.js';
import { recentRequests, history } from '../controllers/dashboardController.js';

const r = Router();
r.get('/owner/dashboard/requests', requireAuth, requireOwner, recentRequests);
r.get('/owner/dashboard/history', requireAuth, requireOwner, history);
export default r;
