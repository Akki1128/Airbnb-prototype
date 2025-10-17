// backend/src/routes/properties.js
import { Router } from 'express';
import { searchProperties, getProperty, checkAvailability } from '../controllers/propertyController.js';

const r = Router();

r.get('/properties', searchProperties);
r.get('/properties/:id', getProperty);
r.get('/properties/:id/availability', checkAvailability);

export default r;
