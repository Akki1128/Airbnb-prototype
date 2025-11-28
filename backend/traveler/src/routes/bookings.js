import { Router } from 'express';
import pool from '../db/pool.js';
import requireAuth from '../middleware/auth.js';
import Joi from 'joi';

const router = Router();

const createSchema = Joi.object({
  propertyId: Joi.number().integer().required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
  guests: Joi.number().integer().min(1).required(),
});

const updateSchema = Joi.object({
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  guests: Joi.number().integer().min(1),
}).min(1);

// Create booking
router.post('/', requireAuth, async (req, res, next) => {
  let conn;
  try {
    const payload = await createSchema.validateAsync(req.body, { abortEarly: false });
    const { propertyId, startDate, endDate, guests } = payload;

    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ error: 'endDate must be after startDate' });
    }

    // Check property + capacity
    const [[prop]] = await pool.query(
      'SELECT capacity FROM properties WHERE id = ?',
      [propertyId]
    );
    if (!prop) return res.status(404).json({ error: 'Property not found' });
    if (guests > prop.capacity) {
      return res.status(400).json({ error: 'Guests exceed capacity' });
    }

    // Check date overlap
    const [overlap] = await pool.query(
      `SELECT 1 FROM bookings
        WHERE property_id = ?
          AND status IN ('Pending','Accepted')
          AND ? <= end_date AND ? >= start_date
        LIMIT 1`,
      [propertyId, startDate, endDate]
    );
    if (overlap.length) {
      return res.status(409).json({ error: 'Property not available for those dates' });
    }

    const travelerId = req.session.userId;
    if (!travelerId) {
      return res.status(401).json({ error: 'Not authenticated as traveler' });
    }

    // Try to get name/email from session, but never allow nulls for NOT NULL cols
    let travelerName =
      req.session.userName ||
      req.session.name ||
      'Traveler';
    let travelerEmail =
      req.session.userEmail ||
      req.session.email ||
      null;

    if (!travelerEmail) {
      travelerEmail = `traveler-${travelerId}@placeholder.local`;
    }

    // Upsert traveler into users, then insert booking, in a transaction
    conn = await pool.getConnection();
    await conn.beginTransaction();

    await conn.query(
      `
      INSERT INTO users (id, role, name, email, password_hash)
      VALUES (?, 'traveler', ?, ?, 'mongo-only-placeholder')
      ON DUPLICATE KEY UPDATE
        role = VALUES(role),
        name = VALUES(name),
        email = VALUES(email)
      `,
      [travelerId, travelerName, travelerEmail]
    );

    const [result] = await conn.query(
      `INSERT INTO bookings (user_id, property_id, start_date, end_date, guests, status)
       VALUES (?, ?, ?, ?, ?, 'Pending')`,
      [travelerId, propertyId, startDate, endDate, guests]
    );

    await conn.commit();
    res.status(201).json({ id: result.insertId, status: 'Pending' });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (rbErr) {
        console.error('[traveler-bookings] Rollback error:', rbErr.message);
      }
    }
    if (err.isJoi) {
      return res.status(400).json({ error: 'Validation failed', details: err.details });
    }
    next(err);
  } finally {
    if (conn) conn.release();
  }
});

// List bookings for logged-in traveler
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status, scope } = req.query;
    const where = ['b.user_id = ?'];
    const params = [req.session.userId];

    if (status) {
      where.push('b.status = ?');
      params.push(status);
    }
    if (scope === 'past') {
      where.push('b.end_date < CURDATE()');
    }

    const [rows] = await pool.query(
      `SELECT b.id,
              b.property_id AS propertyId,
              b.start_date AS startDate,
              b.end_date   AS endDate,
              b.guests,
              b.status,
              p.title,
              p.city,
              p.price
         FROM bookings b
         JOIN properties p ON p.id = b.property_id
        WHERE ${where.join(' AND ')}
        ORDER BY b.start_date DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Modify a booking (Accepted → Pending again)
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const payload = await updateSchema.validateAsync(req.body, { abortEarly: false });

    const [[row]] = await pool.query(
      `SELECT b.id,
              b.user_id     AS userId,
              b.property_id AS propertyId,
              b.start_date  AS startDate,
              b.end_date    AS endDate,
              b.guests,
              b.status,
              p.capacity
         FROM bookings b
         JOIN properties p ON p.id = b.property_id
        WHERE b.id = ?`,
      [id]
    );

    if (!row || row.userId !== req.session.userId) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (row.status === 'Cancelled') {
      return res.status(400).json({ error: 'Cancelled bookings cannot be modified' });
    }

    const newStart = payload.startDate || row.startDate;
    const newEnd   = payload.endDate   || row.endDate;
    const newGuests = payload.guests != null ? payload.guests : row.guests;

    if (new Date(newEnd) < new Date(newStart)) {
      return res.status(400).json({ error: 'endDate must be after startDate' });
    }
    if (newGuests > row.capacity) {
      return res.status(400).json({ error: 'Guests exceed capacity' });
    }

    const [overlap] = await pool.query(
      `SELECT 1 FROM bookings
        WHERE property_id = ?
          AND id <> ?
          AND status IN ('Pending','Accepted')
          AND ? <= end_date AND ? >= start_date
        LIMIT 1`,
      [row.propertyId, id, newStart, newEnd]
    );
    if (overlap.length) {
      return res.status(409).json({ error: 'Property not available for those dates' });
    }

    const newStatus = row.status === 'Accepted' ? 'Pending' : row.status;

    await pool.query(
      `UPDATE bookings
          SET start_date = ?, end_date = ?, guests = ?, status = ?
        WHERE id = ?`,
      [newStart, newEnd, newGuests, newStatus, id]
    );

    res.json({
      id,
      status: newStatus,
      startDate: newStart,
      endDate: newEnd,
      guests: newGuests,
    });
  } catch (err) {
    if (err.isJoi) {
      return res.status(400).json({ error: 'Validation failed', details: err.details });
    }
    next(err);
  }
});

// Cancel a booking
router.post('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const [[row]] = await pool.query(
      'SELECT id, user_id AS userId, status FROM bookings WHERE id = ?',
      [id]
    );
    if (!row || row.userId !== req.session.userId) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (row.status === 'Cancelled') {
      return res.json({ id, status: 'Cancelled' });
    }
    if (row.status !== 'Pending') {
      return res.status(400).json({ error: 'Only Pending bookings can be cancelled' });
    }

    await pool.query('UPDATE bookings SET status = "Cancelled" WHERE id = ?', [id]);
    res.json({ id, status: 'Cancelled' });
  } catch (err) {
    next(err);
  }
});

export default router;
