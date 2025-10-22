import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(fs.readFileSync(path.join(__dirname, 'openapi.json'), 'utf-8'));

export function mountSwagger(app) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
}
