const { getDb } = require('./database');
const bcrypt = require('bcrypt');

async function createAdminIfNone() {
  const db = getDb();

  // Make sure migrations ran
  require('./migrate');

  const existing = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (existing) return;

  const password = process.env.RENDER_ADMIN_PASSWORD || 'ChangeMe123!'; // set strong password in env
  const hash = await bcrypt.hash(password, 12);

  db.prepare(`
    INSERT INTO users (email, password_hash, first_name, last_name, role, status)
    VALUES (?, ?, ?, ?, 'admin', 'active')
  `).run(
    process.env.RENDER_ADMIN_EMAIL || 'terri-mae@tenacityworks.com',
    hash,
    process.env.RENDER_ADMIN_FIRSTNAME || 'Admin',
    process.env.RENDER_ADMIN_LASTNAME || 'User'
  );

  console.log('✅ Default admin created for Render deployment');
}

createAdminIfNone().catch(console.error);