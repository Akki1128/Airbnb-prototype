import { pool } from '../db/pool.js';

export async function recentRequests(req, res, next) {
  try {
    const ownerId = req.session.user.id;
    const [rows] = await pool.query(
      `SELECT b.*, p.title, u.name AS traveler_name
       FROM bookings b
       JOIN properties p ON p.id=b.property_id
       JOIN users u ON u.id=b.traveler_id
       WHERE p.owner_id=? AND b.status='PENDING'
       ORDER BY b.created_at DESC
       LIMIT 20`,
      [ownerId]
    );
    res.json(rows);
  } catch (e) { next(e); }
}

export async function history(req, res, next) {
  try {
    const ownerId = req.session.user.id;
    const [rows] = await pool.query(
      `SELECT b.*, p.title, u.name AS traveler_name
       FROM bookings b
       JOIN properties p ON p.id=b.property_id
       JOIN users u ON u.id=b.traveler_id
       WHERE p.owner_id=? AND b.status='ACCEPTED' AND b.end_date < CURDATE()
       ORDER BY b.end_date DESC
       LIMIT 50`,
      [ownerId]
    );
    res.json(rows);
  } catch (e) { next(e); }
}
