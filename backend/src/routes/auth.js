import { Router } from 'express';
import { signup, login, logout, me } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
const r = Router();

r.post('/auth/signup', signup);
r.post('/auth/login', login);
r.post('/auth/logout', requireAuth, logout);
r.get('/users/me', requireAuth, me);

export default r;
