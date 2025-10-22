import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth, requireOwner } from '../middleware/auth.js';
import { createProperty, listMyProperties, updateProperty, addPhotos } from '../controllers/propertyController.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(__dirname, '../../uploads');
const uploader = multer({ dest: uploadDir });

const r = Router();
r.get('/owner/properties', requireAuth, requireOwner, listMyProperties);
r.post('/owner/properties', requireAuth, requireOwner, createProperty);
r.put('/owner/properties/:id', requireAuth, requireOwner, updateProperty);
r.post('/owner/properties/:id/photos', requireAuth, requireOwner, uploader.array('photos', 10), addPhotos);
export default r;
