// backend/src/swagger.js
import swaggerUi from 'swagger-ui-express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const specPath = path.join(__dirname, 'openapi.json');

// Load the static OpenAPI spec from JSON
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

// Optional: expose the raw JSON to debug if needed
export function mountSwagger(app) {
  app.get('/api/docs.json', (_req, res) => res.json(spec));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec, { swaggerOptions: { withCredentials: true } }));
}
