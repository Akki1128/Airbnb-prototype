import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { addFavorite, removeFavorite, listFavorites, tripsHistory } from '../controllers/favoriteController.js';

const r = Router();
r.post('/favorites/:propertyId', requireAuth, addFavorite);
r.delete('/favorites/:propertyId', requireAuth, removeFavorite);
r.get('/favorites', requireAuth, listFavorites);
r.get('/trips/history', requireAuth, tripsHistory);

export default r;
