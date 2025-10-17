// backend/src/app.js
import 'dotenv/config.js';
import express from 'express';
import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import propertyRoutes from './routes/properties.js';
import bookingRoutes from './routes/bookings.js';
import favoriteRoutes from './routes/favorites.js';
//import ownerRoutes from './routes/owner.js'; // if you added Owner endpoints
import { notFound, errorHandler } from './middleware/errors.js';
import { mountSwagger } from './swagger.js';

process.on('unhandledRejection', (e) => console.error('UNHANDLED REJECTION:', e));
process.on('uncaughtException', (e) => console.error('UNCAUGHT EXCEPTION:', e));

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// CORS / parsers
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Session store (managed connection via options)
const { DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME } = process.env;
const MySQLStore = MySQLStoreFactory(session);
const sessionStore = new MySQLStore({
  host: DB_HOST,
  port: Number(DB_PORT || 3306),
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  createDatabaseTable: true,
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 24 * 60 * 60 * 1000
});

app.use(
  session({
    name: 'sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 1000 * 60 * 60 * 12 }
  })
);

// Static files (profile uploads)
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

// API routes
app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', propertyRoutes);
app.use('/api', bookingRoutes);
app.use('/api', favoriteRoutes);
//app.use('/api', ownerRoutes); // safe if file exists; remove if not using Owner yet

// Swagger docs (browse at http://localhost:8000/api/docs)
mountSwagger(app);

// Errors
app.use(notFound);
app.use(errorHandler);

// Start
const PORT = Number(process.env.PORT || 8000);
app.listen(PORT, () => console.log(`Server listening on :${PORT}`));