const express = require('express');
const { getDb }       = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// ── GET /api/dashboard ───────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const db = getDb();

  // Stat cards
  const totalContacts   = db.prepare("SELECT COUNT(*) AS n FROM contacts").get().n;
  const totalCompanies  = db.prepare("SELECT COUNT(*) AS n FROM companies").get().n;
  const totalInteractions = db.prepare("SELECT COUNT(*) AS n FROM interactions").get().n;
  const deckSentCount   = db.prepare("SELECT COUNT(*) AS n FROM contacts WHERE credentials_deck_sent = 1").get().n;

  // Contacts by owner (bar chart)
  const contactsByOwner = db.prepare(`
    SELECT u.first_name || ' ' || u.last_name AS owner,
           COUNT(c.id) AS count
    FROM contacts c
    LEFT JOIN users u ON c.owner_id = u.id
    GROUP BY c.owner_id
    ORDER BY count DESC
  `).all();

  // Credentials deck doughnut: sent vs not sent
  const deckStats = {
    sent:     deckSentCount,
    not_sent: totalContacts - deckSentCount,
  };

  // Recent interactions (last 10)
  const recentInteractions = db.prepare(`
    SELECT i.id, i.method, i.interaction_date, i.notes,
           c.id AS contact_id,
           c.first_name || ' ' || c.last_name AS contact_name,
           co.name AS company_name,
           u.first_name || ' ' || u.last_name AS user_name,
           u.id AS user_id
    FROM interactions i
    JOIN contacts c ON i.contact_id = c.id
    LEFT JOIN companies co ON c.company_id = co.id
    LEFT JOIN users u ON i.user_id = u.id
    ORDER BY i.interaction_date DESC, i.created_at DESC
    LIMIT 10
  `).all();

  // Contacts needing follow-up (no interaction in 30+ days)
  const needsFollowUp = db.prepare(`
    SELECT c.id, c.first_name, c.last_name, c.status,
           co.name AS company_name,
           u.first_name || ' ' || u.last_name AS owner_name,
           MAX(i.interaction_date) AS last_interaction_date
    FROM contacts c
    LEFT JOIN companies co ON c.company_id = co.id
    LEFT JOIN users u ON c.owner_id = u.id
    LEFT JOIN interactions i ON i.contact_id = c.id
    WHERE c.status = 'active'
    GROUP BY c.id
    HAVING last_interaction_date IS NULL
       OR last_interaction_date < date('now', '-30 days')
    ORDER BY last_interaction_date ASC NULLS FIRST
    LIMIT 10
  `).all();

  res.json({
    stats: {
      total_contacts:      totalContacts,
      total_companies:     totalCompanies,
      total_interactions:  totalInteractions,
      deck_sent:           deckSentCount,
    },
    contacts_by_owner:  contactsByOwner,
    deck_stats:         deckStats,
    recent_interactions: recentInteractions,
    needs_follow_up:    needsFollowUp,
  });
});

// ── GET /api/dashboard/credentials ──────────────────────────────────────────
// Full credentials deck report
router.get('/credentials', (req, res) => {
  const db = getDb();

  const sent = db.prepare(`
    SELECT c.id, c.first_name, c.last_name, c.job_title, c.status,
           c.credentials_deck_sent_date,
           co.name AS company_name,
           u.first_name || ' ' || u.last_name AS owner_name
    FROM contacts c
    LEFT JOIN companies co ON c.company_id = co.id
    LEFT JOIN users u      ON c.owner_id   = u.id
    WHERE c.credentials_deck_sent = 1
    ORDER BY c.credentials_deck_sent_date DESC
  `).all();

  const notSent = db.prepare(`
    SELECT c.id, c.first_name, c.last_name, c.job_title, c.status,
           co.name AS company_name,
           u.first_name || ' ' || u.last_name AS owner_name,
           MAX(i.interaction_date) AS last_interaction_date
    FROM contacts c
    LEFT JOIN companies co ON c.company_id = co.id
    LEFT JOIN users u      ON c.owner_id   = u.id
    LEFT JOIN interactions i ON i.contact_id = c.id
    WHERE c.credentials_deck_sent = 0
    GROUP BY c.id
    ORDER BY c.last_name, c.first_name
  `).all();

  res.json({ sent, not_sent: notSent });
});

module.exports = router;
