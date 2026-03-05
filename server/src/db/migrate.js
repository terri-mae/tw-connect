/**
 * Database migration — creates all tables.
 * Run once on first deploy: node src/db/migrate.js
 * Safe to re-run (CREATE TABLE IF NOT EXISTS).
 */
const { getDb } = require('./database');

function runMigrations() {
  const db = getDb();

  db.exec(`
    -- ─────────────────────────────────────────────
    -- Users
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS users (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      email                 TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash         TEXT    NOT NULL,
      first_name            TEXT    NOT NULL,
      last_name             TEXT    NOT NULL,
      role                  TEXT    NOT NULL DEFAULT 'member' CHECK(role IN ('admin','member')),
      status                TEXT    NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until          TEXT,
      last_login            TEXT,
      created_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    -- ─────────────────────────────────────────────
    -- Companies
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS companies (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      industry   TEXT,
      website    TEXT,
      phone      TEXT,
      location   TEXT,
      notes      TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    -- ─────────────────────────────────────────────
    -- Contacts
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS contacts (
      id                         INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name                 TEXT    NOT NULL,
      last_name                  TEXT    NOT NULL,
      email                      TEXT,
      phone                      TEXT,
      company_id                 INTEGER REFERENCES companies(id) ON DELETE SET NULL,
      job_title                  TEXT,
      location                   TEXT,
      linkedin_url               TEXT,
      status                     TEXT    NOT NULL DEFAULT 'active'
                                   CHECK(status IN ('active','cold','do_not_contact')),
      owner_id                   INTEGER REFERENCES users(id) ON DELETE SET NULL,
      credentials_deck_sent      INTEGER NOT NULL DEFAULT 0 CHECK(credentials_deck_sent IN (0,1)),
      credentials_deck_sent_date TEXT,
      notes                      TEXT,
      created_at                 TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at                 TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    -- ─────────────────────────────────────────────
    -- Contact Tags (normalised)
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS contact_tags (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      tag        TEXT    NOT NULL,
      UNIQUE(contact_id, tag)
    );

    -- ─────────────────────────────────────────────
    -- Interactions
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS interactions (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id            INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      user_id               INTEGER REFERENCES users(id) ON DELETE SET NULL,
      method                TEXT    NOT NULL
                              CHECK(method IN ('email','phone','linkedin','whatsapp','meeting','other')),
      interaction_date      TEXT    NOT NULL,
      notes                 TEXT,
      credentials_deck_sent INTEGER NOT NULL DEFAULT 0 CHECK(credentials_deck_sent IN (0,1)),
      created_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    -- ─────────────────────────────────────────────
    -- Activity Log
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS activity_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action      TEXT    NOT NULL,
      entity_type TEXT,
      entity_id   INTEGER,
      details     TEXT,
      created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    -- ─────────────────────────────────────────────
    -- Indexes
    -- ─────────────────────────────────────────────
    CREATE INDEX IF NOT EXISTS idx_contacts_owner     ON contacts(owner_id);
    CREATE INDEX IF NOT EXISTS idx_contacts_company   ON contacts(company_id);
    CREATE INDEX IF NOT EXISTS idx_contacts_status    ON contacts(status);
    CREATE INDEX IF NOT EXISTS idx_interactions_contact ON interactions(contact_id);
    CREATE INDEX IF NOT EXISTS idx_interactions_date  ON interactions(interaction_date);
    CREATE INDEX IF NOT EXISTS idx_activity_user      ON activity_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_contact_tags       ON contact_tags(contact_id);
  `);

  console.log('✅  Migrations complete — database is ready.');
}

runMigrations();
