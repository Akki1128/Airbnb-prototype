import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || '3306',
    user: process.env.DB_USER || 'airbnb_user',
    password: process.env.DB_PASSWORD || 'YourStrong#Pass123',
    database: process.env.DB_NAME || 'airbnb_app',
  };

  // Simple health endpoint
  app.get('/health', (req, res) => {
    res.json({
      service: 'property',
      status: 'ok',
      time: new Date().toISOString(),
    });
  });

  // Minimal example: list properties (will hit your MySQL "properties" table)
  app.get('/properties', async (req, res) => {
    try {
      const conn = await mysql.createConnection(dbConfig);
      const [rows] = await conn.execute('SELECT * FROM properties LIMIT 50');
      await conn.end();
      res.json(rows);
    } catch (err) {
      console.error('[Property] DB error:', err.message);
      res.status(500).json({ error: 'DB error in property service' });
    }
  });

  /**
   * Create a new property listing.
   * This route is designed so you can start with an EMPTY MySQL database:
   *  - It upserts the owner into `users` (so the FK to properties.owner_id is valid)
   *  - Then inserts the property into `properties`
   *
   * It expects owner info either in the request body or headers:
   *  - body.ownerId / body.ownerName / body.ownerEmail
   *  - or x-user-id / x-user-name / x-user-email headers (from gateway/JWT)
   */
  app.post('/properties', async (req, res) => {
    // Try to get owner info from body first, then from headers
    const ownerId =
      req.body.ownerId || req.header('x-user-id');
    const ownerName =
      req.body.ownerName || req.header('x-user-name') || null;
    const ownerEmail =
      req.body.ownerEmail || req.header('x-user-email') || null;

    const {
      title,
      description,
      type,
      price,
      address,
      city,
      bedrooms,
      bathrooms,
      capacity,
    } = req.body;

    if (!ownerId) {
      return res.status(400).json({
        error: 'ownerId is required (body.ownerId or x-user-id header)',
      });
    }

    if (!title || !type || price == null) {
      return res.status(400).json({
        error: 'title, type and price are required to create a property',
      });
    }

    let conn;
    try {
      conn = await mysql.createConnection(dbConfig);
      await conn.beginTransaction();

      // 1) Ensure the owner exists in MySQL `users` table
      await conn.execute(
        `
        INSERT INTO users (id, name, email, role)
        VALUES (?, ?, ?, 'owner')
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          email = VALUES(email),
          role = VALUES(role)
        `,
        [ownerId, ownerName, ownerEmail]
      );

      // 2) Insert the property referencing this owner
      await conn.execute(
        `
        INSERT INTO properties
          (owner_id, title, description, type, price, address,
           city, bedrooms, bathrooms, capacity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          ownerId,
          title,
          description || null,
          type || null,
          price,
          address || null,
          city || null,
          bedrooms || null,
          bathrooms || null,
          capacity || null,
        ]
      );

      await conn.commit();
      res.status(201).json({ message: 'Property created successfully' });
    } catch (err) {
      if (conn) {
        try {
          await conn.rollback();
        } catch (rollbackErr) {
          console.error('[Property] Rollback error:', rollbackErr.message);
        }
      }
      console.error('[Property] Error creating property:', err.message);
      res.status(500).json({
        error: 'Error creating property',
        details: err.message,
      });
    } finally {
      if (conn) {
        await conn.end();
      }
    }
  });

  return app;
}
