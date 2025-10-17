import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { getProfile, updateProfile } from '../controllers/userController.js';
import { requireAuth } from '../middleware/auth.js';

const uploadDir = path.resolve('src/uploads/profile');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

const r = Router();
r.get('/profile', requireAuth, getProfile);
r.put('/profile', requireAuth, upload.single('photo'), updateProfile);

export default r;
