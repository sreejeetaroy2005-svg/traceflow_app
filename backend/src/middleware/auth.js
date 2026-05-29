const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'traceflow-dev-secret';

function auth(roles = []) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer '))
      return res.status(401).json({ error: 'No token provided' });
    try {
      const payload = jwt.verify(header.slice(7), SECRET);
      req.user = payload;
      if (roles.length && !roles.includes(payload.role))
        return res.status(403).json({ error: 'Insufficient permissions' });
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

module.exports = auth;
