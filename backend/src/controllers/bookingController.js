import { pool } from '../db/pool.js';

export async function createBooking(req, res, next) {
  try {
    const travelerId = req.session.user.id;
    const { propertyId, start, end, guests } = req.body || {};
    if (!propertyId || !start || !end || !guests) {
      return res.status(400).json({ error: 'propertyId,start,end,guests required' });
    }

    const [[prop]] = await pool.query(`SELECT id, guests_max FROM properties WHERE id=?`, [propertyId]);
    if (!prop) return res.status(404).json({ error: 'Property not found' });
    if (guests > prop.guests_max) return res.status(400).json({ error: 'Guests exceed capacity' });

    const [result] = await pool.query(
      `INSERT INTO bookings (traveler_id, property_id, start_date, end_date, guests, status)
       VALUES (?,?,?,?,?, 'PENDING')`,
      [travelerId, propertyId, start, end, guests]
    );
    res.status(201).json({ id: result.insertId, status: 'PENDING' });
  } catch (err) { next(err); }
}

export async function listTravelerBookings(req, res, next) {
  try {
    const travelerId = req.session.user.id;
    const status = req.query.status;
    const params = [travelerId];
    let where = 'WHERE b.traveler_id = ?';
    if (status) { where += ' AND b.status = ?'; params.push(status); }

    const [rows] = await pool.query(
      `
      SELECT b.*, p.title, p.city, p.country, p.price_per_night
      FROM bookings b
      JOIN properties p ON p.id=b.property_id
      ${where}
      ORDER BY b.created_at DESC
      `, params
    );
    res.json(rows);
  } catch (err) { next(err); }
}
