// backend/owner/src/app.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import path from 'path';
import { fileURLToPath } from 'url';

import { errorHandler } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import propertyRoutes from './routes/properties.js';
import bookingRoutes from './routes/bookings.js';
import dashboardRoutes from './routes/dashboard.js';
import healthRoutes from './routes/health.js';
import { mountSwagger } from './swagger.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** CORS + body parsers **/
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

/** Sessions (owner-specific cookie). Use direct DSN config (no pooled conn at bootstrap). */
const MySQLStore = MySQLStoreFactory(session);
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  createDatabaseTable: true,
});

app.use(session({
  name: 'sid_owner',
  secret: process.env.SESSION_SECRET_OWNER || 'owner_secret',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    sameSite: 'lax',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
}));

/** Static uploads (local to owner package) */
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

/** Routes */
app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', profileRoutes);
app.use('/api', propertyRoutes);
app.use('/api', bookingRoutes);
app.use('/api', dashboardRoutes);

/** Swagger UI */
mountSwagger(app);

/** Errors */
app.use(errorHandler);

/** Start */
const PORT = Number(process.env.PORT || 8001);
app.listen(PORT, () => {
  console.log(`Owner API listening on :${PORT}`);
});
