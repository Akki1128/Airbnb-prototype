import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createBooking, listTravelerBookings } from '../controllers/bookingController.js';

const r = Router();
r.post('/bookings', requireAuth, createBooking);
r.get('/bookings', requireAuth, listTravelerBookings);

export default r;
