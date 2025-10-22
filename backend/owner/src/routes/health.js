import { Router } from 'express';
const r = Router();
r.get('/health', (_req, res) => res.json({ status: 'ok', service: 'Owner API' }));
export default r;
