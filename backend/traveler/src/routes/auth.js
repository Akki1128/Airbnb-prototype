// backend/traveler/src/routes/auth.js
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import User from '../models/User.js';
import requireAuth from '../middleware/auth.js';
import pool from '../db/pool.js';            // MySQL pool

const router = Router();

/**
 * Helper: create or update a MySQL profile row for this traveler.
 * - id is the Mongo _id string
 * - keeps email/name in sync
 */
async function syncTravelerProfileToMySQL(mongoUser) {
  const uid = String(mongoUser._id);
  const name = mongoUser.name || '';
  const email = mongoUser.email;
  const role = mongoUser.role || 'traveler';

  try {
    // Use ON DUPLICATE KEY so this works for both signup and re-signup cases
    await pool.query(
      `
      INSERT INTO users (id, name, email, role)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        email = VALUES(email),
        role = VALUES(role)
      `,
      [uid, name, email, role]
    );
    console.log('>>> [AUTH] MySQL profile synced for traveler id =', uid);
  } catch (err) {
    console.error('>>> [AUTH] MySQL sync error:', err);
    // IMPORTANT: do NOT throw, auth should still succeed
  }
}

/**
 * POST /api/auth/signup
 * Traveler signup: stores user in MongoDB with encrypted password,
 * then syncs a profile row into MySQL `users` table.
 */
router.post('/signup', async (req, res, next) => {
  console.log('>>> [AUTH] Mongo SIGNUP handler reached, body =', req.body);
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, password required' });
    }

    // Check for ANY existing user with this email (any role),
    // because Mongo has a unique index on email.
    const existing = await User.findOne({ email });
    if (existing) {
      console.log('>>> [AUTH] Existing user found in Mongo for', email);
      return res.status(409).json({ error: 'Email already in use' });
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // Create traveler user in Mongo
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 'traveler',
    });

    console.log('>>> [AUTH] Mongo traveler created:', {
      _id: user._id,
      email: user.email,
      role: user.role,
    });

    // ✅ Sync profile into MySQL (non-blocking for auth success)
    await syncTravelerProfileToMySQL(user);

    // Store session info (Mongo-backed session store)
    req.session.userId = user._id.toString();
    req.session.role = 'traveler';

    res.status(201).json({
      id: String(user._id),
      source: 'traveler-mongo-auth',
      name: user.name,
      email: user.email,
      role: 'traveler',
    });
  } catch (err) {
    console.error('>>> [AUTH] SIGNUP error:', err);

    // Gracefully handle duplicate email race-condition against the unique index
    if (err?.code === 11000 && err?.keyPattern && err.keyPattern.email) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    next(err);
  }
});

/**
 * POST /api/auth/login
 * Traveler login: verifies Mongo user with bcrypt and sets session,
 * then backfills MySQL `users` row if it does not exist yet.
 */
router.post('/login', async (req, res, next) => {
  console.log('>>> [AUTH] Mongo LOGIN handler reached, body =', req.body);
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email, password required' });
    }

    // Find by email only (works for traveler or owner role).
    // The role is stored on the document and will be reflected in the session.
    const user = await User.findOne({ email });
    if (!user) {
      console.log('>>> [AUTH] No Mongo user for email', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      console.log('>>> [AUTH] Password mismatch for email', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Set Mongo-backed session
    req.session.userId = user._id.toString();
    req.session.role = user.role || 'traveler';

    // ✅ Backfill MySQL profile row if missing (for users created before sync existed)
    try {
      const uid = String(user._id);
      const [rows] = await pool.query(
        'SELECT id FROM users WHERE id = ?',
        [uid]
      );
      if (!rows.length) {
        console.log(
          '>>> [AUTH] No MySQL profile for traveler id =',
          uid,
          '—creating now'
        );
        await syncTravelerProfileToMySQL(user);
      }
    } catch (err) {
      console.error('>>> [AUTH] MySQL backfill error on login:', err);
      // Do NOT fail login if this breaks
    }

    res.json({
      id: String(user._id),
      source: 'traveler-mongo-auth',
      name: user.name,
      email: user.email,
      role: req.session.role,
    });
  } catch (err) {
    console.error('>>> [AUTH] LOGIN error:', err);
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Clears the session and cookie.
 */
router.post('/logout', (req, res) => {
  console.log('>>> [AUTH] LOGOUT called');
  if (req.session) {
    req.session.destroy(() => {
      res.clearCookie('sid');
      res.status(204).end();
    });
  } else {
    res.status(204).end();
  }
});

/**
 * POST /api/auth/session-token
 * Returns a short-lived token (120s) representing the current session
 * for Owner API to exchange and set its own session.
 */
router.post('/session-token', requireAuth, (req, res) => {
  console.log('>>> [AUTH] SESSION-TOKEN for userId =', req.session.userId);
  const payload = {
    id: req.session.userId,
    role: req.session.role || 'traveler',
  };

  const token = jwt.sign(
    payload,
    process.env.SSO_JWT_SECRET || 'dev_sso_secret',
    {
      expiresIn: '120s',
      issuer: 'traveler-api',
      audience: 'owner-api',
    }
  );

  res.json({ token });
});

export default router;
