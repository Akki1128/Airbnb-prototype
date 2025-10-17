export function requireAuth(req, res, next) {
    if (req.session?.user) return next();
    res.status(401).json({ error: 'Unauthorized' });
  }
  
  export function requireRole(role) {
    return (req, res, next) =>
      req.session?.user?.role === role ? next() : res.status(403).json({ error: 'Forbidden' });
  }
  