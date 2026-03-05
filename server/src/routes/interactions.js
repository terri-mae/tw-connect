const express = require('express');
const { getDb }          = require('../db/database');
const { requireAuth }    = require('../middleware/auth');
const { logActivity }    = require('../middleware/activityLogger');
const { validateInteraction } = require('../validators');

const router = express.Router();
router.use(requireAuth);

// ── GET /api/interactions ────────────────────────────────────────────────────
// Recent interactions (for dashboard)
router.get('/', (req, res) => {
  const db    = getDb();
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 10);

  const rows = db.prepare(`
    SELECT i.*,
           c.first_name || ' ' || c.last_name AS contact_name,
           c.id AS contact_id,
           co.name AS company_name,
           u.first_name || ' ' || u.last_name AS user_name,
           u.id AS logged_by_id
    FROM interactions i
    JOIN contacts c ON i.contact_id = c.id
    LEFT JOIN companies co ON c.company_id = co.id
    LEFT JOIN users u ON i.user_id = u.id
    ORDER BY i.interaction_date DESC, i.created_at DESC
    LIMIT ?
  `).all(limit);

  res.json({ interactions: rows });
});

// ── POST /api/interactions ───────────────────────────────────────────────────
router.post('/', (req, res) => {
  const {
    contact_id, method, interaction_date, notes,
    credentials_deck_sent = 0,
  } = req.body;

  if (!contact_id) return res.status(400).json({ error: 'contact_id is required' });

  const { valid, errors } = validateInteraction({ method, interaction_date, notes });
  if (!valid) return res.status(400).json({ error: errors.join(', ') });

  const db = getDb();
  const contact = db.prepare('SELECT id, owner_id, credentials_deck_sent FROM contacts WHERE id = ?')
    .get(contact_id);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  const info = db.prepare(`
    INSERT INTO interactions (contact_id, user_id, method, interaction_date, notes, credentials_deck_sent)
    VALUES (?,?,?,?,?,?)
  `).run(
    contact_id,
    req.user.id,
    method,
    interaction_date,
    notes.trim(),
    credentials_deck_sent ? 1 : 0
  );

  // If deck was marked as sent during this interaction, update the contact record
  if (credentials_deck_sent) {
    db.prepare(
      'UPDATE contacts SET credentials_deck_sent = 1, credentials_deck_sent_date = ?, updated_at = ? WHERE id = ?'
    ).run(interaction_date, new Date().toISOString(), contact_id);
  }

  const id = info.lastInsertRowid;
  logActivity(req.user.id, 'create_interaction', 'interaction', id, { contact_id, method });

  const created = db.prepare(`
    SELECT i.*,
           u.first_name || ' ' || u.last_name AS user_name
    FROM interactions i LEFT JOIN users u ON i.user_id = u.id
    WHERE i.id = ?
  `).get(id);
  res.status(201).json({ interaction: created });
});

// ── PATCH /api/interactions/:id ──────────────────────────────────────────────
router.patch('/:id', (req, res) => {
  const db   = getDb();
  const id   = parseInt(req.params.id, 10);
  const item = db.prepare('SELECT * FROM interactions WHERE id = ?').get(id);
  if (!item) return res.status(404).json({ error: 'Interaction not found' });

  // Only the logger or an admin can edit
  if (req.user.role !== 'admin' && item.user_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit your own interactions' });
  }

  const allowed = ['method', 'interaction_date', 'notes', 'credentials_deck_sent'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (updates.credentials_deck_sent !== undefined) {
    updates.credentials_deck_sent = updates.credentials_deck_sent ? 1 : 0;
  }
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nothing to update' });

  updates.updated_at = new Date().toISOString();
  const cols = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE interactions SET ${cols} WHERE id = ?`).run(...Object.values(updates), id);

  logActivity(req.user.id, 'update_interaction', 'interaction', id);
  const updated = db.prepare(`
    SELECT i.*, u.first_name || ' ' || u.last_name AS user_name
    FROM interactions i LEFT JOIN users u ON i.user_id = u.id WHERE i.id = ?
  `).get(id);
  res.json({ interaction: updated });
});

// ── DELETE /api/interactions/:id ─────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const db   = getDb();
  const id   = parseInt(req.params.id, 10);
  const item = db.prepare('SELECT * FROM interactions WHERE id = ?').get(id);
  if (!item) return res.status(404).json({ error: 'Interaction not found' });

  if (req.user.role !== 'admin' && item.user_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own interactions' });
  }

  db.prepare('DELETE FROM interactions WHERE id = ?').run(id);
  logActivity(req.user.id, 'delete_interaction', 'interaction', id);
  res.json({ message: 'Interaction deleted' });
});

module.exports = router;
