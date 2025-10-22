import { pool } from '../db/pool.js';

export async function listIncoming(req, res, next) {
  try {
    const ownerId = req.session.user.id;
    const status = req.query.status || 'PENDING';
    const [rows] = await pool.query(
      `SELECT b.*, p.title, p.city, p.country, u.name AS traveler_name, u.email AS traveler_email
       FROM bookings b
       JOIN properties p ON p.id=b.property_id
       JOIN users u ON u.id=b.traveler_id
       WHERE p.owner_id=? AND b.status=?
       ORDER BY b.created_at DESC`,
      [ownerId, status]
    );
    res.json(rows);
  } catch (e) { next(e); }
}

export async function acceptBooking(req, res, next) {
  try {
    const ownerId = req.session.user.id;
    const id = Number(req.params.id);

    const [rows] = await pool.query(
      `SELECT b.*, p.owner_id FROM bookings b JOIN properties p ON p.id=b.property_id WHERE b.id=?`,
      [id]
    );
    const b = rows[0];
    if (!b || b.owner_id !== ownerId) return res.status(404).json({ error: 'Not found' });
    if (b.status !== 'PENDING') return res.status(400).json({ error: 'Only PENDING can be accepted' });

    // check overlap against already ACCEPTED bookings
    const [conflicts] = await pool.query(
      `SELECT id FROM bookings
       WHERE property_id=? AND status='ACCEPTED'
         AND NOT (end_date <= ? OR start_date >= ?)`,
      [b.property_id, b.start_date, b.end_date]
    );
    if (conflicts.length) return res.status(409).json({ error: 'Dates already booked' });

    await pool.query(`UPDATE bookings SET status='ACCEPTED' WHERE id=?`, [id]);
    res.json({ id, status: 'ACCEPTED' });
  } catch (e) { next(e); }
}

export async function cancelBooking(req, res, next) {
  try {
    const ownerId = req.session.user.id;
    const id = Number(req.params.id);

    const [rows] = await pool.query(
      `SELECT b.*, p.owner_id FROM bookings b JOIN properties p ON p.id=b.property_id WHERE b.id=?`,
      [id]
    );
    const b = rows[0];
    if (!b || b.owner_id !== ownerId) return res.status(404).json({ error: 'Not found' });
    if (b.status === 'CANCELLED') return res.json({ id, status: 'CANCELLED' });

    await pool.query(`UPDATE bookings SET status='CANCELLED' WHERE id=?`, [id]);
    res.json({ id, status: 'CANCELLED' });
  } catch (e) { next(e); }
}
