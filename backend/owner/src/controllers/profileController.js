import Joi from 'joi';
import { pool } from '../db/pool.js';

const updateSchema = Joi.object({
  name: Joi.string().min(2).max(80),
  email: Joi.string().email(),
  phone: Joi.string().allow(null, ''),
  about: Joi.string().allow(null, ''),
  city: Joi.string().allow(null, ''),
  state: Joi.string().max(2).uppercase().allow(null, ''),
  country: Joi.string().allow(null, '')
}).min(1);

export async function getProfile(req, res, next) {
  try {
    const uid = req.session.user.id;
    const [rows] = await pool.query('SELECT id, role, name, email, phone, about, city, state, country, languages, gender, profile_photo_url FROM users WHERE id=?', [uid]);
    res.json(rows[0]);
  } catch (e) { next(e); }
}

export async function updateProfile(req, res, next) {
  try {
    const uid = req.session.user.id;
    const body = { ...req.body };
    if (req.file) body.profile_photo_url = `/uploads/${req.file.filename}`;

    const { value, error } = updateSchema.validate(body);
    if (error) return res.status(400).json({ error: error.message });

    const fields = Object.keys(value);
    if (!fields.length) return res.json({ ok: true });

    const sets = fields.map(k => `${k}=?`).join(', ');
    const params = [...fields.map(k => value[k]), uid];
    await pool.query(`UPDATE users SET ${sets} WHERE id=?`, params);

    const [rows] = await pool.query('SELECT id, role, name, email, phone, about, city, state, country, languages, gender, profile_photo_url FROM users WHERE id=?', [uid]);
    res.json(rows[0]);
  } catch (e) { next(e); }
}
