import bcrypt from 'bcryptjs';
import Joi from 'joi';
import { pool } from '../db/pool.js';

const signupSchema = Joi.object({
  name: Joi.string().min(2).max(80).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  city: Joi.string().allow(null, ''),
  state: Joi.string().max(2).uppercase().allow(null, ''),
  country: Joi.string().allow(null, '')
});

export async function signup(req, res, next) {
  try {
    const { value, error } = signupSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const [exists] = await pool.query('SELECT id FROM users WHERE email=?', [value.email]);
    if (exists.length) return res.status(400).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(value.password, 12);
    const [r] = await pool.query(
      `INSERT INTO users (role, name, email, password_hash, city, state, country)
       VALUES ('OWNER', ?, ?, ?, ?, ?, ?)`,
      [value.name, value.email, hash, value.city || null, value.state || null, value.country || null]
    );
    const user = { id: r.insertId, role: 'OWNER', name: value.name, email: value.email };
    req.session.user = user;
    res.status(201).json({ user });
  } catch (e) { next(e); }
}

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export async function login(req, res, next) {
  try {
    const { value, error } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const [rows] = await pool.query('SELECT id, role, name, email, password_hash FROM users WHERE email=?', [value.email]);
    const u = rows[0];
    if (!u || u.role !== 'OWNER') return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(value.password, u.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const user = { id: u.id, role: 'OWNER', name: u.name, email: u.email };
    req.session.user = user;
    res.json({ user });
  } catch (e) { next(e); }
}

export async function logout(req, res, next) {
  try {
    req.session.destroy(() => res.json({ ok: true }));
  } catch (e) { next(e); }
}

export async function me(req, res) {
  res.json({ user: req.session.user });
}
