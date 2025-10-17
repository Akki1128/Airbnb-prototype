import mysql from 'mysql2/promise';
const { DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME } = process.env;

export const pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT || 3306),
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
