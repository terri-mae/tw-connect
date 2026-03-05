const express = require('express');
const { getDb }          = require('../db/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { logActivity }    = require('../middleware/activityLogger');
const { validateCompany, parsePagination } = require('../validators');

const router = express.Router();
router.use(requireAuth);

// ── GET /api/companies ───────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const db = getDb();
  const { page, limit, offset } = parsePagination(req.query);
  const search = req.query.search?.trim() || '';

  let where = '';
  const params = [];
  if (search) {
    where = "WHERE c.name LIKE ? OR c.industry LIKE ? OR c.location LIKE ?";
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const rows = db.prepare(`
    SELECT c.*,
           COUNT(DISTINCT ct.id) AS contact_count
    FROM companies c
    LEFT JOIN contacts ct ON ct.company_id = c.id
    ${where}
    GROUP BY c.id
    ORDER BY c.name
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) AS n FROM companies c ${where}`).get(...params).n;
  res.json({ companies: rows, total, page, pages: Math.ceil(total / limit) });
});

// ── GET /api/companies/all ───────────────────────────────────────────────────
// Lightweight list for dropdowns
router.get('/all', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT id, name FROM companies ORDER BY name').all();
  res.json({ companies: rows });
});

// ── GET /api/companies/:id ───────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const db = getDb();
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
  if (!company) return res.status(404).json({ error: 'Company not found' });

  // Contacts belonging to this company
  const contacts = db.prepare(`
    SELECT c.id, c.first_name, c.last_name, c.job_title, c.status,
           c.credentials_deck_sent,
           u.first_name || ' ' || u.last_name AS owner_name
    FROM contacts c
    LEFT JOIN users u ON c.owner_id = u.id
    WHERE c.company_id = ?
    ORDER BY c.first_name, c.last_name
  `).all(company.id);

  // Recent interactions across all contacts in this company
  const interactions = db.prepare(`
    SELECT i.*, c.first_name || ' ' || c.last_name AS contact_name,
           u.first_name || ' ' || u.last_name AS user_name
    FROM interactions i
    JOIN contacts c ON i.contact_id = c.id
    LEFT JOIN users u ON i.user_id = u.id
    WHERE c.company_id = ?
    ORDER BY i.interaction_date DESC, i.created_at DESC
    LIMIT 20
  `).all(company.id);

  res.json({ company, contacts, interactions });
});

// ── POST /api/companies ──────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { name, industry, website, phone, location, notes } = req.body;
  const { valid, errors } = validateCompany({ name });
  if (!valid) return res.status(400).json({ error: errors.join(', ') });

  const db   = getDb();
  const info = db.prepare(`
    INSERT INTO companies (name, industry, website, phone, location, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    name.trim(),
    industry?.trim() || null,
    website?.trim()  || null,
    phone?.trim()    || null,
    location?.trim() || null,
    notes?.trim()    || null,
    req.user.id
  );

  logActivity(req.user.id, 'create_company', 'company', info.lastInsertRowid, { name });
  const created = db.prepare('SELECT * FROM companies WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ company: created });
});

// ── PATCH /api/companies/:id ─────────────────────────────────────────────────
router.patch('/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id, 10);
  const company = db.prepare('SELECT id FROM companies WHERE id = ?').get(id);
  if (!company) return res.status(404).json({ error: 'Company not found' });

  const allowed = ['name', 'industry', 'website', 'phone', 'location', 'notes'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key]?.trim() || null;
  }
  if (updates.name === null) return res.status(400).json({ error: 'name is required' });
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nothing to update' });

  updates.updated_at = new Date().toISOString();
  const cols = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE companies SET ${cols} WHERE id = ?`).run(...Object.values(updates), id);

  logActivity(req.user.id, 'update_company', 'company', id);
  res.json({ company: db.prepare('SELECT * FROM companies WHERE id = ?').get(id) });
});

// ── DELETE /api/companies/:id ────────────────────────────────────────────────
router.delete('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id, 10);
  const company = db.prepare('SELECT name FROM companies WHERE id = ?').get(id);
  if (!company) return res.status(404).json({ error: 'Company not found' });

  // Null-out company_id on linked contacts (keep contacts)
  db.prepare('UPDATE contacts SET company_id = NULL, updated_at = ? WHERE company_id = ?')
    .run(new Date().toISOString(), id);
  db.prepare('DELETE FROM companies WHERE id = ?').run(id);
  logActivity(req.user.id, 'delete_company', 'company', id, { name: company.name });
  res.json({ message: 'Company deleted' });
});

module.exports = router;
