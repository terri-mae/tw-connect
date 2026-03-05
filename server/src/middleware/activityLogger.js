const { getDb } = require('../db/database');

/**
 * Logs an action to the activity_log table.
 *
 * @param {number|null} userId
 * @param {string} action  - e.g. 'create_contact', 'delete_interaction'
 * @param {string|null} entityType - 'contact' | 'company' | 'interaction' | 'user'
 * @param {number|null} entityId
 * @param {object|null} details  - arbitrary JSON-serialisable object
 */
function logActivity(userId, action, entityType = null, entityId = null, details = null) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      userId ?? null,
      action,
      entityType,
      entityId ?? null,
      details ? JSON.stringify(details) : null
    );
  } catch (err) {
    // Never let logging failure break a request
    console.error('Activity log error:', err.message);
  }
}

module.exports = { logActivity };
