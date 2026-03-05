const express = require('express');
const bcrypt  = require('bcrypt');
const { getDb }           = require('../db/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { logActivity }     = require('../middleware/activityLogger');
const { validateUser }    = require('../validators');

const router = express.Router();

// All user management routes require auth
router.use(requireAuth);

// ── GET /api/users ──────────────────────────────────────────────────────────
// Admin: all users. Member: just themselves.
router.get('/', (req, res) => {
  const db = getDb();
  if (req.user.role === 'admin') {
    const users = db.prepare(
      `SELECT id, email, first_name, last_name, role, status, last_login, created_at
       FROM users ORDER BY first_name, last_name`
    ).all();
    return res.json({ users });
  }
  // Members only see themselves
  const user = db.prepare(
    'SELECT id, email, first_name, last_name, role, status FROM users WHERE id = ?'
  ).get(req.user.id);
  res.json({ users: [user] });
});

// ── GET /api/users/:id ──────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (req.user.role !== 'admin' && req.user.id !== id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const db   = getDb();
  const user = db.prepare(
    `SELECT id, email, first_name, last_name, role, status, last_login, created_at
     FROM users WHERE id = ?`
  ).get(id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// ── POST /api/users ─────────────────────────────────────────────────────────
// Admin only: create a new team member
router.post('/', requireAdmin, async (req, res) => {
  const { email, password, first_name, last_name, role = 'member' } = req.body;

  const { valid, errors } = validateUser({ email, password, first_name, last_name, role });
  if (!valid) return res.status(400).json({ error: errors.join(', ') });

  const db = getDb();
  const exists = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email.trim());
  if (exists) return res.status(409).json({ error: 'A user with that email already exists' });

  const hash = await bcrypt.hash(password, 12);
  const info = db.prepare(`
    INSERT INTO users (email, password_hash, first_name, last_name, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(email.toLowerCase().trim(), hash, first_name.trim(), last_name.trim(), role);

  logActivity(req.user.id, 'create_user', 'user', info.lastInsertRowid, { email });
  const created = db.prepare(
    'SELECT id, email, first_name, last_name, role, status, created_at FROM users WHERE id = ?'
  ).get(info.lastInsertRowid);
  res.status(201).json({ user: created });
});

// ── PATCH /api/users/:id ────────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (req.user.role !== 'admin' && req.user.id !== id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const db   = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { first_name, last_name, email, role, status, password } = req.body;

  // Members cannot change their own role
  if (req.user.role !== 'admin' && role !== undefined) {
    return res.status(403).json({ error: 'Only admins can change roles' });
  }
  // Cannot deactivate yourself
  if (status === 'inactive' && req.user.id === id) {
    return res.status(400).json({ error: 'You cannot deactivate your own account' });
  }

  const updates = {};
  if (first_name !== undefined) updates.first_name = first_name.trim();
  if (last_name  !== undefined) updates.last_name  = last_name.trim();
  if (email      !== undefined) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    updates.email = email.toLowerCase().trim();
  }
  if (role   !== undefined && req.user.role === 'admin') updates.role   = role;
  if (status !== undefined && req.user.role === 'admin') updates.status = status;

  if (password !== undefined) {
    if (password.length < 10) return res.status(400).json({ error: 'Password must be at least 10 characters' });
    updates.password_hash = await bcrypt.hash(password, 12);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields provided' });
  }

  updates.updated_at = new Date().toISOString();
  const cols = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE users SET ${cols} WHERE id = ?`).run(...Object.values(updates), id);

  logActivity(req.user.id, 'update_user', 'user', id, { fields: Object.keys(updates) });
  const updated = db.prepare(
    'SELECT id, email, first_name, last_name, role, status, last_login, created_at FROM users WHERE id = ?'
  ).get(id);
  res.json({ user: updated });
});

// ── POST /api/users/:id/reset-password ─────────────────────────────────────
// Admin only: force reset another user's password
router.post('/:id/reset-password', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { password } = req.body;
  if (!password || password.length < 10) {
    return res.status(400).json({ error: 'Password must be at least 10 characters' });
  }
  const db = getDb();
  const hash = await bcrypt.hash(password, 12);
  db.prepare(
    'UPDATE users SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?'
  ).run(hash, new Date().toISOString(), id);
  logActivity(req.user.id, 'reset_password', 'user', id);
  res.json({ message: 'Password updated' });
});

// ── GET /api/users/activity-log ─────────────────────────────────────────────
router.get('/admin/activity-log', requireAdmin, (req, res) => {
  const db   = getDb();
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = 50;
  const offset = (page - 1) * limit;

  const rows = db.prepare(`
    SELECT al.*, u.first_name || ' ' || u.last_name AS user_name, u.email AS user_email
    FROM activity_log al
    LEFT JOIN users u ON al.user_id = u.id
    ORDER BY al.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  const total = db.prepare('SELECT COUNT(*) AS n FROM activity_log').get().n;
  res.json({ activity: rows, total, page, pages: Math.ceil(total / limit) });
});

module.exports = router;
