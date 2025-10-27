import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';

// ---- Routes ----
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import propertyRoutes from './routes/properties.js';
import bookingRoutes from './routes/bookings.js';
import dashboardRoutes from './routes/dashboard.js';
import ssoRoutes from './routes/sso.js';     
import hostRoutes from './routes/host.js';    

const app = express();

// ---- Parsers ----
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- CORS ----
const allowed = [
  process.env.CORS_ORIGIN || 'http://localhost:5173',
  'http://localhost:3000',
  `http://localhost:${process.env.PORT || 8001}`
];
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowed.includes(origin)),
  credentials: true
}));

// ---- Sessions ----
app.use(session({
  name: 'owner_sid',
  secret: process.env.SESSION_SECRET || 'dev_fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

// ---- Static /uploads ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

// ---- Mount API routes ----
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/auth', ssoRoutes);          
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/host', hostRoutes);         

// ---- Swagger UI at /api-docs ----
const openapiPath = path.resolve(__dirname, 'openapi.json');
if (fs.existsSync(openapiPath)) {
  const swaggerDoc = JSON.parse(fs.readFileSync(openapiPath, 'utf-8'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
    swaggerOptions: { withCredentials: true }
  }));
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
    return res.status(400).json({ error: 'Validation failed', details: err.details });
  }
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const port = Number(process.env.PORT || 8001);
app.listen(port, () => {
  console.log(`Owner API listening on :${port}`);
});

export default app;
