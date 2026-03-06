const express  = require('express');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const { getDb }         = require('../db/database');
const { requireAuth }   = require('../middleware/auth');
const { logActivity }   = require('../middleware/activityLogger');

const router = express.Router();

const LOCK_ATTEMPTS  = 5;
const LOCK_MINUTES   = 15;
const SESSION_HOURS  = 8;
const COOKIE_NAME    = 'twc_token';

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // must be true for HTTPS
    sameSite: 'none',                              // allow cross-origin cookie
    maxAge: SESSION_HOURS * 60 * 60 * 1000,
  };
}

// ── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = getDb();
  const user = db.prepare(
    'SELECT * FROM users WHERE email = ? COLLATE NOCASE'
  ).get(email.trim());

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (user.status === 'inactive') {
    return res.status(403).json({ error: 'Your account has been deactivated. Contact an admin.' });
  }

  // Check brute-force lock
  if (user.locked_until) {
    const lockExpiry = new Date(user.locked_until);
    if (lockExpiry > new Date()) {
      const remaining = Math.ceil((lockExpiry - new Date()) / 60000);
      return res.status(429).json({
        error: `Account locked. Try again in ${remaining} minute${remaining !== 1 ? 's' : ''}.`,
      });
    }
  }

  const match = await bcrypt.compare(password, user.password_hash);

  if (!match) {
    const newAttempts = user.failed_login_attempts + 1;
    const lockedUntil = newAttempts >= LOCK_ATTEMPTS
      ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString()
      : null;

    db.prepare(
      'UPDATE users SET failed_login_attempts = ?, locked_until = ?, updated_at = ? WHERE id = ?'
    ).run(newAttempts, lockedUntil, new Date().toISOString(), user.id);

    if (lockedUntil) {
      return res.status(429).json({
        error: `Too many failed attempts. Account locked for ${LOCK_MINUTES} minutes.`,
      });
    }

    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Success — reset failed attempts + update last_login
  db.prepare(
    'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = ?, updated_at = ? WHERE id = ?'
  ).run(new Date().toISOString(), new Date().toISOString(), user.id);

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: `${SESSION_HOURS}h` }
  );

  res.cookie(COOKIE_NAME, token, cookieOptions()); // ✅ Updated cookie options
  logActivity(user.id, 'login', 'user', user.id);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
    },
  });
});

// ── POST /api/auth/logout ───────────────────────────────────────────────────
router.post('/logout', requireAuth, (req, res) => {
  logActivity(req.user.id, 'logout', 'user', req.user.id);
  res.clearCookie(COOKIE_NAME, cookieOptions()); // clear with same options
  res.json({ message: 'Logged out' });
});

// ── GET /api/auth/me ────────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;