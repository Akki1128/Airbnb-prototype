import path from 'node:path';
import { pool } from '../db/pool.js';
import { profileUpdateSchema } from '../utils/validation.js';

export async function getProfile(req, res, next) {
  try {
    const id = req.session.user.id;
    const [rows] = await pool.query(
      `SELECT id, role, name, email, phone, about, city, state, country, languages, gender, profile_photo_url
       FROM users WHERE id=?`, [id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
}

export async function updateProfile(req, res, next) {
  try {
    const id = req.session.user.id;
    const { value, error } = profileUpdateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const fields = [];
    const params = [];
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) { fields.push(`${k}=?`); params.push(v); }
    }
    if (req.file) {
      const url = `/uploads/profile/${path.basename(req.file.path)}`;
      fields.push('profile_photo_url=?'); params.push(url);
    }
    if (!fields.length) return res.json({ updated: 0 });

    params.push(id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id=?`, params);

    const [rows] = await pool.query(
      `SELECT id, role, name, email, phone, about, city, state, country, languages, gender, profile_photo_url
       FROM users WHERE id=?`, [id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
}
