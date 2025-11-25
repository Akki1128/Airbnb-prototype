// backend/traveler/src/app.js
import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';

// Use shared Mongo URI config + connector
import { mongoUri, connectMongoTraveler } from './config/mongo.js';

// ---- Routes ----
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import propertyRoutes from './routes/properties.js';
import bookingRoutes from './routes/bookings.js';
import favoritesRoutes from './routes/favorites.js';

const app = express();

// ---- CONNECT TO MONGO FIRST ----
connectMongoTraveler()
  .then(() => {
    console.log('🟢 Traveler Mongo connected BEFORE app middleware');
  })
  .catch((err) => {
    console.error('🔴 Traveler Mongo failed to connect:', err);
    process.exit(1);
  });

// ---- Parsers ----
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- CORS ----

// Public frontend origin for EC2 (can be overridden by env)
const deploymentOrigin =
  process.env.PUBLIC_FRONTEND_ORIGIN || 'http://54.187.250.215:3000';

const allowed = [
  // Optional explicit origin via env (you can set this differently on EC2 vs local)
  process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Local React dev servers
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',

  // Backend as origin (rarely used, but keeping your original entry)
  `http://localhost:${process.env.PORT || 8000}`,

  // EC2 frontend
  deploymentOrigin,
];

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow:
      //   - no Origin header (curl, Postman, JMeter)
      //   - any origin in our allowlist
      if (!origin || allowed.includes(origin)) {
        return cb(null, true);
      }
      console.warn('[CORS] Blocked origin:', origin);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// ---- Sessions (stored in MongoDB) ----
const sessionSecret = process.env.SESSION_SECRET || 'dev_fallback_secret';

app.use(
  session({
    name: 'sid',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      // use the same mongo URI that mongoose connects to
      mongoUrl: mongoUri,
      collectionName: 'sessions',
    }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// ---- Static /uploads ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

// ---- Mount API routes ----
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/favorites', favoritesRoutes);

// ---- Swagger UI at /api-docs (no auto-open) ----
const openapiPath = path.resolve(__dirname, 'openapi.json');
if (fs.existsSync(openapiPath)) {
  const swaggerDoc = JSON.parse(fs.readFileSync(openapiPath, 'utf-8'));
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDoc, {
      swaggerOptions: { withCredentials: true },
    })
  );
} else {
  console.warn('[Swagger] openapi.json not found; /api-docs disabled');
}

// ---- Error handler ----
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err && err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Duplicate entry' });
  }
  if (err && err.isJoi) {
    return res
      .status(400)
      .json({ error: 'Validation failed', details: err.details });
  }
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// ---- Debug whoami ----
app.get('/__whoami', (_req, res) => {
  res.json({
    service: 'traveler-mongo',
    time: new Date().toISOString(),
  });
});

export default app;
