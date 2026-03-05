/**
 * Create the first admin account.
 * Usage: node src/db/seed-admin.js
 *
 * Reads from environment or prompts for credentials.
 * Safe: exits if an admin already exists.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '..', '.env') });
const bcrypt = require('bcrypt');
const readline = require('readline');
const { getDb } = require('./database');

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); });
  });
}

async function main() {
  const db = getDb();

  // Run migrations first to ensure tables exist
  require('./migrate');

  const existing = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (existing) {
    console.log('ℹ️  An admin account already exists. Skipping.');
    process.exit(0);
  }

  console.log('\n── Create First Admin Account ──\n');

  const firstName = await prompt('First name: ');
  const lastName  = await prompt('Last name:  ');
  const email     = await prompt('Email:      ');
  const password  = await prompt('Password (min 10 chars): ');

  if (!firstName || !lastName || !email || !password) {
    console.error('❌  All fields are required.'); process.exit(1);
  }
  if (password.length < 10) {
    console.error('❌  Password must be at least 10 characters.'); process.exit(1);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('❌  Invalid email address.'); process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);

  db.prepare(`
    INSERT INTO users (email, password_hash, first_name, last_name, role, status)
    VALUES (?, ?, ?, ?, 'admin', 'active')
  `).run(email.toLowerCase(), hash, firstName, lastName);

  console.log(`\n✅  Admin account created for ${firstName} ${lastName} (${email})`);
  console.log('   You can now log in at /login.\n');
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
