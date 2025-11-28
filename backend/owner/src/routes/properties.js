// owner/src/routes/properties.js
import { Router } from 'express';
import pool from '../db/pool.js';
import requireAuth from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import Joi from 'joi';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `prop_${req.session.userId}_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

const propSchema = Joi.object({
  title: Joi.string().min(3).max(120).required(),
  type: Joi.string().max(60).required(),
  description: Joi.string().allow(''),
  amenities: Joi.array().items(Joi.string()).default([]),
  price: Joi.number().positive().required(),
  address: Joi.string().max(255).allow(''),
  city: Joi.string().max(80).required(),
  bedrooms: Joi.number().integer().min(0).required(),
  bathrooms: Joi.number().integer().min(0).required(),
  capacity: Joi.number().integer().min(1).required()
});

/** POST /api/properties  (create/post property) */
router.post('/', requireAuth, async (req, res, next) => {
  let conn;
  try {
    const p = await propSchema.validateAsync(req.body, { abortEarly: false });

    const ownerId = req.session.userId;
    // Try to get name/email from session, but ensure they are NEVER null
    let ownerName =
      req.session.userName ||
      req.session.name ||
      'Owner';
    let ownerEmail =
      req.session.userEmail ||
      req.session.email ||
      null;

    if (!ownerId) {
      return res.status(401).json({ error: 'Not authenticated as owner' });
    }

    // Fallback to a unique placeholder email if we don't have a real one
    if (!ownerEmail) {
      ownerEmail = `owner-${ownerId}@placeholder.local`;
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 1) Ensure the owner exists in MySQL `users` table
    //    Provide all NOT NULL fields: id, role, name, email, password_hash.
    //    password_hash is a dummy because auth is handled via Mongo.
    await conn.query(
      `
      INSERT INTO users (id, role, name, email, password_hash)
      VALUES (?, 'owner', ?, ?, 'mongo-only-placeholder')
      ON DUPLICATE KEY UPDATE
        role = VALUES(role),
        name = VALUES(name),
        email = VALUES(email)
      `,
      [ownerId, ownerName, ownerEmail]
    );

    // 2) Insert the property referencing this owner
    const [r] = await conn.query(
      `INSERT INTO properties
        (owner_id,title,type,description,amenities,price,address,city,bedrooms,bathrooms,capacity)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        ownerId,
        p.title,
        p.type,
        p.description || '',
        JSON.stringify(p.amenities || []),
        p.price,
        p.address || '',
        p.city,
        p.bedrooms,
        p.bathrooms,
        p.capacity
      ]
    );

    await conn.commit();
    res.status(201).json({ id: r.insertId });
  } catch (e) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (rollbackErr) {
        console.error('[Owner properties] Rollback error:', rollbackErr.message);
      }
    }
    if (e.isJoi) {
      return res
        .status(400)
        .json({ error: 'Validation failed', details: e.details });
    }
    next(e);
  } finally {
    if (conn) conn.release();
  }
});

/** PUT /api/properties/:id (edit details) */
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const pid = Number(req.params.id);
    const p = await propSchema
      .fork(Object.keys(propSchema.describe().keys), (s) => s.optional())
      .validateAsync(req.body, { abortEarly: false });

    await pool.query(
      `UPDATE properties SET
         title=COALESCE(?,title), type=COALESCE(?,type), description=COALESCE(?,description),
         amenities=COALESCE(?,amenities), price=COALESCE(?,price), address=COALESCE(?,address),
         city=COALESCE(?,city), bedrooms=COALESCE(?,bedrooms), bathrooms=COALESCE(?,bathrooms),
         capacity=COALESCE(?,capacity)
       WHERE id=? AND owner_id=?`,
      [
        p.title ?? null,
        p.type ?? null,
        p.description ?? null,
        p.amenities ? JSON.stringify(p.amenities) : null,
        p.price ?? null,
        p.address ?? null,
        p.city ?? null,
        p.bedrooms ?? null,
        p.bathrooms ?? null,
        p.capacity ?? null,
        pid,
        req.session.userId
      ]
    );
    res.json({ ok: true });
  } catch (e) {
    if (e.isJoi) {
      return res
        .status(400)
        .json({ error: 'Validation failed', details: e.details });
    }
    next(e);
  }
});

/** GET /api/properties (list my properties) */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id,title,type,price,city,address,bedrooms,bathrooms,capacity,amenities
         FROM properties WHERE owner_id=? ORDER BY id DESC`,
      [req.session.userId]
    );

    const out = rows.map((r) => {
      if (typeof r.amenities === 'string') {
        try {
          r.amenities = JSON.parse(r.amenities);
        } catch {
          r.amenities = [];
        }
      }
      return r;
    });

    res.json(out);
  } catch (e) {
    next(e);
  }
});

/** GET /api/properties/:id */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const pid = Number(req.params.id);
    const [[p]] = await pool.query(
      `SELECT id,title,type,description,amenities,price,address,city,bedrooms,bathrooms,capacity,photos
         FROM properties WHERE id=? AND owner_id=?`,
      [pid, req.session.userId]
    );
    if (!p) return res.status(404).json({ error: 'Property not found' });
    if (typeof p.amenities === 'string') {
      try {
        p.amenities = JSON.parse(p.amenities);
      } catch {
        p.amenities = [];
      }
    }
    if (typeof p.photos === 'string') {
      try {
        p.photos = JSON.parse(p.photos);
      } catch {
        p.photos = [];
      }
    }
    res.json(p);
  } catch (e) {
    next(e);
  }
});

/** POST /api/properties/:id/photos (upload one photo) */
router.post('/:id/photos', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    const pid = Number(req.params.id);
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const absoluteUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    const [[row]] = await pool.query(
      `SELECT photos FROM properties WHERE id=? AND owner_id=?`,
      [pid, req.session.userId]
    );
    if (!row) return res.status(404).json({ error: 'Property not found' });

    let photos = [];
    if (row.photos) {
      try {
        photos = typeof row.photos === 'string' ? JSON.parse(row.photos) : row.photos;
      } catch {
        photos = [];
      }
    }
    photos = Array.isArray(photos) ? photos : [];
    photos.push(absoluteUrl);

    await pool.query(
      `UPDATE properties SET photos=? WHERE id=? AND owner_id=?`,
      [JSON.stringify(photos), pid, req.session.userId]
    );

    res.json({ url: absoluteUrl, photos });
  } catch (e) {
    next(e);
  }
});

export default router;
