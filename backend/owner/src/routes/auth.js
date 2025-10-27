import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/pool.js';

const router = Router();

/** POST /api/auth/signup */
router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password, location } = req.body || {};
    if (!name || !email || !password || !location) {
      return res.status(400).json({ error: 'name, email, password, location required' });
    }
    const [dupe] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    if (dupe.length) return res.status(409).json({ error: 'Email already in use' });

    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query(
      'INSERT INTO users (name,email,password_hash,role,city) VALUES (?,?,?,?,?)',
      [name, email, hash, 'owner', location]
    );
    req.session.userId = r.insertId;
    req.session.role = 'owner';
    res.status(201).json({ id: r.insertId, name, email, location, role: 'owner' });
  } catch (e) { next(e); }
});

/** POST /api/auth/login */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email, password required' });
    const [rows] = await pool.query('SELECT id,name,email,password_hash,role,city FROM users WHERE email=?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const u = rows[0];
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    if (u.role !== 'owner') return res.status(403).json({ error: 'Not an owner account' });
    req.session.userId = u.id;
    req.session.role = 'owner';
    res.json({ id: u.id, name: u.name, email: u.email, location: u.city, role: 'owner' });
  } catch (e) { next(e); }
});

/** POST /api/auth/logout */
router.post('/logout', (req, res) => {
  req.session?.destroy(() => {
    res.clearCookie('sid');
    res.status(204).end();
  });
});

export default router;

