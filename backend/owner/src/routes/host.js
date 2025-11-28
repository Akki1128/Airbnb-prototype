// backend/owner/src/routes/host.js
import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

/**
 * Minimal User model bound to the existing Mongo "users" collection.
 * - strict: false so we don't interfere with whatever schema traveler used.
 * - mongoose.models.User reuse avoids OverwriteModelError if a User model
 *   is already registered elsewhere in this service.
 */
const userSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const User = mongoose.models.User || mongoose.model('User', userSchema);

/**
 * POST /api/host/enable
 * Requires an Owner-service session (set after /api/auth/exchange).
 * Flips the user role to 'owner' and refreshes the session values.
 */
router.post('/enable', async (req, res, next) => {
  try {
    const uid = req.session?.userId;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    // Update the user's role in MongoDB instead of MySQL
    await User.updateOne(
      { _id: new mongoose.Types.ObjectId(uid) },
      { $set: { role: 'owner' } }
    );

    // Keep session behavior exactly as before
    req.session.user = { id: uid, role: 'owner' };
    req.session.userId = uid;
    req.session.role = 'owner';

    res.json({ ok: true, role: 'owner' });
  } catch (e) {
    next(e);
  }
});

export default router;
