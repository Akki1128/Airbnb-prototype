// backend/src/controllers/propertyController.js
import { pool } from '../db/pool.js';
import { searchSchema } from '../utils/validation.js';

/**
 * Normalize input to 'YYYY-MM-DD' for DATE columns.
 */
function toYMD(d) {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

/**
 * GET /api/properties
 * Query: city, start (YYYY-MM-DD), end (YYYY-MM-DD), guests, page, pageSize
 * Returns paginated available properties (excludes overlaps with ACCEPTED bookings)
 */
export async function searchProperties(req, res, next) {
  try {
    const { value, error } = searchSchema.validate(req.query);
    if (error) return res.status(400).json({ error: error.message });

    const { city, guests } = value;
    const startYMD = toYMD(value.start);
    const endYMD   = toYMD(value.end);

    // Safe numeric pagination
    const pageSize = Math.max(1, Math.min(100, Number(value.pageSize) || 20));
    const page     = Math.max(1, Number(value.page) || 1);
    const offset   = (page - 1) * pageSize;

    // Main list query — embed ONLY numeric LIMIT/OFFSET, keep dates as bound params
    const sqlList = `
      SELECT p.*
      FROM properties p
      WHERE p.city = ?
        AND p.guests_max >= ?
        AND NOT EXISTS (
          SELECT 1
          FROM bookings b
          WHERE b.property_id = p.id
            AND b.status = 'ACCEPTED'
            AND NOT (b.end_date < DATE(?) OR b.start_date > DATE(?))
        )
      ORDER BY p.created_at DESC
      LIMIT ${offset}, ${pageSize};
    `;
    const [items] = await pool.query(sqlList, [city, guests, startYMD, endYMD]);

    // Count query (no LIMIT/OFFSET)
    const sqlCount = `
      SELECT COUNT(*) AS total
      FROM properties p
      WHERE p.city = ?
        AND p.guests_max >= ?
        AND NOT EXISTS (
          SELECT 1
          FROM bookings b
          WHERE b.property_id = p.id
            AND b.status = 'ACCEPTED'
            AND NOT (b.end_date < DATE(?) OR b.start_date > DATE(?))
        )
    `;
    const [cnt] = await pool.query(sqlCount, [city, guests, startYMD, endYMD]);

    res.json({ items, page, pageSize, total: cnt[0]?.total ?? 0 });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/properties/:id
 * Returns property details + photos[]
 */
export async function getProperty(req, res, next) {
  try {
    const id = Number(req.params.id);
    const [[prop]] = await pool.query(`SELECT * FROM properties WHERE id = ?`, [id]);
    if (!prop) return res.status(404).json({ error: 'Property not found' });

    const [photos] = await pool.query(`SELECT url FROM property_photos WHERE property_id = ?`, [id]);
    res.json({ ...prop, photos: photos.map(p => p.url) });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/properties/:id/availability?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Returns { propertyId, start, end, available }
 */
export async function checkAvailability(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { start, end } = req.query || {};
    if (!start || !end) return res.status(400).json({ error: 'start and end are required (YYYY-MM-DD)' });

    const startYMD = toYMD(start);
    const endYMD   = toYMD(end);

    const [[exists]] = await pool.query(`SELECT id FROM properties WHERE id = ?`, [id]);
    if (!exists) return res.status(404).json({ error: 'Property not found' });

    const [[row]] = await pool.query(
      `SELECT COUNT(*) AS cnt
       FROM bookings
       WHERE property_id = ?
         AND status = 'ACCEPTED'
         AND NOT (end_date < DATE(?) OR start_date > DATE(?))`,
      [id, startYMD, endYMD]
    );

    res.json({ propertyId: id, start: startYMD, end: endYMD, available: row.cnt === 0 });
  } catch (err) {
    next(err);
  }
}
