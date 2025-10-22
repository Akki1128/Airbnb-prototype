import { Router } from 'express';
import { requireAuth, requireOwner } from '../middleware/auth.js';
import { listIncoming, acceptBooking, cancelBooking } from '../controllers/bookingController.js';

const r = Router();
r.get('/owner/bookings', requireAuth, requireOwner, listIncoming);
r.patch('/owner/bookings/:id/accept', requireAuth, requireOwner, acceptBooking);
r.patch('/owner/bookings/:id/cancel', requireAuth, requireOwner, cancelBooking);
export default r;
