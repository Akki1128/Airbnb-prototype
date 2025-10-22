export function requireAuth(req, res, next) {
    if (req.session?.user) return next();
    res.status(401).json({ error: 'Unauthorized' });
  }
  
  export function requireOwner(req, res, next) {
    if (req.session?.user?.role === 'OWNER') return next();
    res.status(403).json({ error: 'Forbidden: owner only' });
  }
  