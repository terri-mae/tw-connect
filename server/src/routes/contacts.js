const express = require('express');
const { getDb }          = require('../db/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { logActivity }    = require('../middleware/activityLogger');
const { validateContact, parsePagination } = require('../validators');

const router = express.Router();
router.use(requireAuth);

// ── Helper: fetch tags for a contact id (or array) ──────────────────────────
function getTagsForContact(db, contactId) {
  return db.prepare('SELECT tag FROM contact_tags WHERE contact_id = ? ORDER BY tag')
    .all(contactId)
    .map(r => r.tag);
}

function setTags(db, contactId, tags) {
  db.prepare('DELETE FROM contact_tags WHERE contact_id = ?').run(contactId);
  const insert = db.prepare('INSERT OR IGNORE INTO contact_tags (contact_id, tag) VALUES (?, ?)');
  for (const tag of tags) {
    const t = tag.trim().toLowerCase();
    if (t) insert.run(contactId, t);
  }
}

// ── GET /api/contacts ────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const db = getDb();
  const { page, limit, offset } = parsePagination(req.query);

  const { search, owner_id, status, deck_sent, tag, sort = 'name', order = 'asc' } = req.query;

  const conditions = [];
  const params     = [];

  if (search) {
    conditions.push(`(
      c.first_name LIKE ? OR c.last_name LIKE ?
      OR c.email LIKE ? OR c.phone LIKE ?
      OR co.name LIKE ?
      OR (c.first_name || ' ' || c.last_name) LIKE ?
    )`);
    const s = `%${search.trim()}%`;
    params.push(s, s, s, s, s, s);
  }

  if (owner_id) { conditions.push('c.owner_id = ?'); params.push(owner_id); }
  if (status)   { conditions.push('c.status = ?');   params.push(status); }
  if (deck_sent !== undefined && deck_sent !== '') {
    conditions.push('c.credentials_deck_sent = ?');
    params.push(deck_sent === 'true' || deck_sent === '1' ? 1 : 0);
  }
  if (tag) {
    conditions.push('EXISTS (SELECT 1 FROM contact_tags ct WHERE ct.contact_id = c.id AND ct.tag = ?)');
    params.push(tag.trim().toLowerCase());
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const SORT_MAP = {
    name:           'c.last_name, c.first_name',
    company:        'co.name',
    last_interaction: 'last_interaction_date',
    created:        'c.created_at',
  };
  const ORDER_DIR = order === 'desc' ? 'DESC' : 'ASC';
  const sortCol   = SORT_MAP[sort] || SORT_MAP.name;

  const rows = db.prepare(`
    SELECT
      c.id, c.first_name, c.last_name, c.email, c.phone,
      c.job_title, c.status, c.location, c.linkedin_url,
      c.credentials_deck_sent, c.credentials_deck_sent_date,
      c.created_at, c.updated_at,
      co.id   AS company_id,   co.name AS company_name,
      u.id    AS owner_id,
      u.first_name || ' ' || u.last_name AS owner_name,
      (SELECT MAX(i.interaction_date)
       FROM interactions i WHERE i.contact_id = c.id) AS last_interaction_date
    FROM contacts c
    LEFT JOIN companies co ON c.company_id = co.id
    LEFT JOIN users u      ON c.owner_id   = u.id
    ${where}
    ORDER BY ${sortCol} ${ORDER_DIR}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(
    `SELECT COUNT(*) AS n FROM contacts c
     LEFT JOIN companies co ON c.company_id = co.id
     LEFT JOIN users u ON c.owner_id = u.id
     ${where}`
  ).get(...params).n;

  // Attach tags
  const withTags = rows.map(r => ({ ...r, tags: getTagsForContact(db, r.id) }));

  res.json({ contacts: withTags, total, page, pages: Math.ceil(total / limit) });
});

// ── GET /api/contacts/search ─────────────────────────────────────────────────
// Quick search for header global search (returns compact list)
router.get('/search', (req, res) => {
  const q = req.query.q?.trim();
  if (!q || q.length < 2) return res.json({ results: [] });

  const db = getDb();
  const s  = `%${q}%`;
  const results = db.prepare(`
    SELECT c.id, c.first_name, c.last_name, c.email, c.job_title,
           co.name AS company_name
    FROM contacts c
    LEFT JOIN companies co ON c.company_id = co.id
    WHERE (c.first_name || ' ' || c.last_name) LIKE ?
       OR c.email LIKE ? OR co.name LIKE ?
    LIMIT 8
  `).all(s, s, s);
  res.json({ results });
});

// ── GET /api/contacts/:id ────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const db      = getDb();
  const contact = db.prepare(`
    SELECT c.*,
           co.id   AS company_id,   co.name AS company_name,
           u.first_name || ' ' || u.last_name AS owner_name
    FROM contacts c
    LEFT JOIN companies co ON c.company_id = co.id
    LEFT JOIN users u      ON c.owner_id   = u.id
    WHERE c.id = ?
  `).get(req.params.id);

  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  const tags = getTagsForContact(db, contact.id);

  const interactions = db.prepare(`
    SELECT i.*,
           u.first_name || ' ' || u.last_name AS user_name,
           u.id AS logged_by_id
    FROM interactions i
    LEFT JOIN users u ON i.user_id = u.id
    WHERE i.contact_id = ?
    ORDER BY i.interaction_date DESC, i.created_at DESC
  `).all(contact.id);

  res.json({ contact: { ...contact, tags }, interactions });
});

// ── POST /api/contacts ───────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const {
    first_name, last_name, email, phone, company_id, job_title,
    location, linkedin_url, status = 'active',
    owner_id, credentials_deck_sent = 0, credentials_deck_sent_date,
    notes, tags = [],
  } = req.body;

  const { valid, errors } = validateContact({ first_name, last_name, email, status });
  if (!valid) return res.status(400).json({ error: errors.join(', ') });

  const db  = getDb();
  const oid = owner_id || req.user.id;

  const info = db.prepare(`
    INSERT INTO contacts
      (first_name, last_name, email, phone, company_id, job_title,
       location, linkedin_url, status, owner_id,
       credentials_deck_sent, credentials_deck_sent_date, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    first_name.trim(), last_name.trim(),
    email?.trim()       || null,
    phone?.trim()       || null,
    company_id          || null,
    job_title?.trim()   || null,
    location?.trim()    || null,
    linkedin_url?.trim()|| null,
    status,
    oid,
    credentials_deck_sent ? 1 : 0,
    credentials_deck_sent_date || null,
    notes?.trim()       || null
  );

  const id = info.lastInsertRowid;
  if (Array.isArray(tags) && tags.length) setTags(db, id, tags);

  logActivity(req.user.id, 'create_contact', 'contact', id, { first_name, last_name });
  const created = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  res.status(201).json({ contact: { ...created, tags: getTagsForContact(db, id) } });
});

// ── PATCH /api/contacts/:id ──────────────────────────────────────────────────
router.patch('/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id, 10);
  const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Contact not found' });

  // Members can only edit contacts they own
  if (req.user.role !== 'admin' && existing.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit your own contacts' });
  }

  const allowed = [
    'first_name','last_name','email','phone','company_id','job_title',
    'location','linkedin_url','status','owner_id',
    'credentials_deck_sent','credentials_deck_sent_date','notes',
  ];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (updates.email !== undefined && updates.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  if (updates.credentials_deck_sent !== undefined) {
    updates.credentials_deck_sent = updates.credentials_deck_sent ? 1 : 0;
  }

  if (Object.keys(updates).length === 0 && req.body.tags === undefined) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  if (Object.keys(updates).length > 0) {
    updates.updated_at = new Date().toISOString();
    const cols = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE contacts SET ${cols} WHERE id = ?`).run(...Object.values(updates), id);
  }

  if (Array.isArray(req.body.tags)) setTags(db, id, req.body.tags);

  logActivity(req.user.id, 'update_contact', 'contact', id);
  const updated = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  res.json({ contact: { ...updated, tags: getTagsForContact(db, id) } });
});

// ── DELETE /api/contacts/:id ─────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id, 10);
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  if (req.user.role !== 'admin' && contact.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own contacts' });
  }

  db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
  logActivity(req.user.id, 'delete_contact', 'contact', id, {
    name: `${contact.first_name} ${contact.last_name}`,
  });
  res.json({ message: 'Contact deleted' });
});

// ── POST /api/contacts/import ────────────────────────────────────────────────
// Bulk import from CSV (already parsed by client, sent as JSON array)
router.post('/import', (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'No rows provided' });
  }

  const db = getDb();
  const insert = db.prepare(`
    INSERT INTO contacts
      (first_name, last_name, email, phone, company_id, job_title,
       location, linkedin_url, status, owner_id, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `);

  const importMany = db.transaction((rows) => {
    const results = { created: 0, skipped: 0, errors: [] };
    for (const row of rows) {
      if (!row.first_name?.trim() || !row.last_name?.trim()) {
        results.skipped++;
        results.errors.push(`Skipped row — missing first_name or last_name: ${JSON.stringify(row)}`);
        continue;
      }
      try {
        insert.run(
          row.first_name.trim(),
          row.last_name.trim(),
          row.email?.trim()     || null,
          row.phone?.trim()     || null,
          row.company_id        || null,
          row.job_title?.trim() || null,
          row.location?.trim()  || null,
          row.linkedin_url?.trim() || null,
          ['active','cold','do_not_contact'].includes(row.status) ? row.status : 'active',
          req.user.id,
          row.notes?.trim()     || null
        );
        results.created++;
      } catch (e) {
        results.skipped++;
        results.errors.push(`Error on row: ${e.message}`);
      }
    }
    return results;
  });

  const result = importMany(rows);
  logActivity(req.user.id, 'import_contacts', 'contact', null, { count: result.created });
  res.json(result);
});

module.exports = router;
