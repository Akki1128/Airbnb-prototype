import Joi from 'joi';
import { pool } from '../db/pool.js';

const propSchema = Joi.object({
  title: Joi.string().min(3).max(120).required(),
  description: Joi.string().allow('', null),
  type: Joi.string().valid('apartment','house','room','villa','other').required(),
  bedrooms: Joi.number().integer().min(0).required(),
  bathrooms: Joi.number().min(0).required(),
  amenities: Joi.array().items(Joi.string()).default([]),
  price_per_night: Joi.number().precision(2).min(0).required(),
  city: Joi.string().required(),
  state: Joi.string().uppercase().max(2).allow(null, ''),
  country: Joi.string().required(),
  guests_max: Joi.number().integer().min(1).required()
});

export async function createProperty(req, res, next) {
  try {
    const { value, error } = propSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const ownerId = req.session.user.id;
    const [r] = await pool.query(
      `INSERT INTO properties (owner_id, title, description, type, bedrooms, bathrooms, amenities, price_per_night, city, state, country, guests_max)
       VALUES (?, ?, ?, ?, ?, ?, JSON_ARRAY(?), ?, ?, ?, ?, ?)`,
      [
        ownerId, value.title, value.description || null, value.type,
        value.bedrooms, value.bathrooms, (value.amenities || []),
        value.price_per_night, value.city, value.state || null, value.country, value.guests_max
      ]
    );
    res.status(201).json({ id: r.insertId });
  } catch (e) { next(e); }
}

export async function listMyProperties(req, res, next) {
  try {
    const ownerId = req.session.user.id;
    const [rows] = await pool.query(
      `SELECT * FROM properties WHERE owner_id=? ORDER BY created_at DESC`,
      [ownerId]
    );
    res.json(rows);
  } catch (e) { next(e); }
}

const updateSchema = propSchema.fork(
  ['title','type','bedrooms','bathrooms','price_per_night','city','country','guests_max'],
  s => s.optional()
);

export async function updateProperty(req, res, next) {
  try {
    const id = Number(req.params.id);
    const ownerId = req.session.user.id;
    const { value, error } = updateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const [chk] = await pool.query('SELECT id FROM properties WHERE id=? AND owner_id=?', [id, ownerId]);
    if (!chk.length) return res.status(404).json({ error: 'Not found' });

    const fields = Object.keys(value);
    if (!fields.length) return res.json({ ok: true });

    const sets = fields.map(k => `${k}=${k==='amenities' ? 'JSON_ARRAY(?)' : '?'}`).join(', ');
    const params = fields.map(k => value[k]).concat([id, ownerId]);
    await pool.query(`UPDATE properties SET ${sets} WHERE id=? AND owner_id=?`, params);

    const [rows] = await pool.query('SELECT * FROM properties WHERE id=?', [id]);
    res.json(rows[0]);
  } catch (e) { next(e); }
}

export async function addPhotos(req, res, next) {
  try {
    const id = Number(req.params.id);
    const ownerId = req.session.user.id;
    const [chk] = await pool.query('SELECT id FROM properties WHERE id=? AND owner_id=?', [id, ownerId]);
    if (!chk.length) return res.status(404).json({ error: 'Not found' });

    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'No files uploaded' });

    const values = files.map(f => [id, `/uploads/${f.filename}`]);
    await pool.query(
      'INSERT INTO property_photos (property_id, photo_url) VALUES ?',
      [values]
    );
    res.status(201).json({ count: values.length });
  } catch (e) { next(e); }
}
