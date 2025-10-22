import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth, requireOwner } from '../middleware/auth.js';
import { getProfile, updateProfile } from '../controllers/profileController.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(__dirname, '../../uploads');
const uploader = multer({ dest: uploadDir });

const r = Router();
r.get('/profile', requireAuth, requireOwner, getProfile);
r.put('/profile', requireAuth, requireOwner, uploader.single('photo'), updateProfile);
export default r;
