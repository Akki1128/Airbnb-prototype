import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { signupSchema, loginSchema } from '../utils/validation.js';

export async function signup(req, res, next) {
  try {
    const { value, error } = signupSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    const { name, email, password, role } = value;

    const [exists] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    if (exists.length) return res.status(400).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      `INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)`,
      [name, email, password_hash, role]
    );

    const user = { id: result.insertId, name, email, role };
    req.session.user = user;
    res.status(201).json({ user });
  } catch (err) { next(err); }
}

export async function login(req, res, next) {
  try {
    const { value, error } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    const { email, password } = value;

    const [rows] = await pool.query('SELECT id,name,email,password_hash,role FROM users WHERE email=?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid email or password' });

    const u = rows[0];
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const user = { id: u.id, name: u.name, email: u.email, role: u.role };
    req.session.user = user;
    res.json({ user });
  } catch (err) { next(err); }
}

export async function logout(req, res, next) {
  try {
    req.session.destroy(() => {
      res.clearCookie('sid');
      res.json({ ok: true });
    });
  } catch (err) { next(err); }
}

export async function me(req, res) {
  res.json({ user: req.session.user });
}
