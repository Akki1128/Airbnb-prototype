// traveler/src/db/pool.js

import mysql from 'mysql2/promise';

// Accept either DB_PASS or DB_PASSWORD (quoted in .env if it has #)
const password = process.env.DB_PASS || process.env.DB_PASSWORD || '';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password,
  database: process.env.DB_NAME || 'airbnb_app',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Safe debug line 
console.log('[DB ENVs]', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  name: process.env.DB_NAME,
  passProvided: password ? 'yes' : 'no'
});

// Quick connection check you can call from app.js
export async function checkConnection() {
  try {
    await pool.query('SELECT 1');
    console.log(
      `[DB] Connected to ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME || 'airbnb_app'}`
    );
  } catch (err) {
    console.error('[DB] Connection check failed:', err.message);
  }
}

export default pool;
