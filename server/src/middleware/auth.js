const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');

/**
 * Verifies JWT from httpOnly cookie and attaches req.user.
 */
function requireAuth(req, res, next) {
  const token = req.cookies?.twc_token;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Session expired — please log in again' });
  }

  const db = getDb();
  const user = db.prepare(
    'SELECT id, email, first_name, last_name, role, status FROM users WHERE id = ?'
  ).get(payload.userId);

  if (!user || user.status === 'inactive') {
    return res.status(401).json({ error: 'Account inactive or not found' });
  }

  req.user = user;
  next();
}

/**
 * Requires the authenticated user to have the 'admin' role.
 * Must be used after requireAuth.
 */
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
