import { pool } from '../db/pool.js';

export async function addFavorite(req, res, next) {
  try {
    const travelerId = req.session.user.id;
    const propertyId = Number(req.params.propertyId);
    await pool.query(`INSERT IGNORE INTO favorites (traveler_id, property_id) VALUES (?,?)`,
      [travelerId, propertyId]);
    res.status(204).end();
  } catch (err) { next(err); }
}

export async function removeFavorite(req, res, next) {
  try {
    const travelerId = req.session.user.id;
    const propertyId = Number(req.params.propertyId);
    await pool.query(`DELETE FROM favorites WHERE traveler_id=? AND property_id=?`,
      [travelerId, propertyId]);
    res.status(204).end();
  } catch (err) { next(err); }
}

export async function listFavorites(req, res, next) {
  try {
    const travelerId = req.session.user.id;
    const [rows] = await pool.query(
      `
      SELECT p.*
      FROM favorites f
      JOIN properties p ON p.id=f.property_id
      WHERE f.traveler_id=?
      ORDER BY f.created_at DESC
      `, [travelerId]
    );
    res.json(rows);
  } catch (err) { next(err); }
}

export async function tripsHistory(req, res, next) {
  try {
    const travelerId = req.session.user.id;
    const [rows] = await pool.query(
      `
      SELECT b.*, p.title, p.city, p.country
      FROM bookings b
      JOIN properties p ON p.id=b.property_id
      WHERE b.traveler_id=? AND b.status='ACCEPTED' AND b.end_date < CURDATE()
      ORDER BY b.end_date DESC
      `, [travelerId]
    );
    res.json(rows);
  } catch (err) { next(err); }
}
