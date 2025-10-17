import { Router } from 'express';
const r = Router();
r.get('/health', (req, res) => res.json({ status: 'ok', service: 'Airbnb API' }));
export default r;
