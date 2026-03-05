// server/src/server.js
const app = require('./app');
const path = require('path');
const fs = require('fs');

console.log('\n--- TW Connect starting up (debug mode) ---');
console.log('cwd:', process.cwd());
console.log('node version:', process.version);

// Helpful environment checks (do not print secrets)
console.log('PORT:', process.env.PORT || 3001);
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('CLIENT_ORIGIN set?', Boolean(process.env.CLIENT_ORIGIN));
console.log('JWT_SECRET set?', Boolean(process.env.JWT_SECRET));

// ----------------------
// Ensure DB folder and file exist
// ----------------------
const dbPath = path.resolve(__dirname, '..', '..', 'database', 'twconnect.db');

try {
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, ''); // create empty DB file
    console.log('✅ Created empty database file at', dbPath);
  } else {
    console.log('✅ Database file exists at', dbPath);
  }
} catch (err) {
  console.error('❌ Failed to create/check DB file:', err);
  // fail fast so logs show reason
  process.exit(1);
}

// ----------------------
// Run migrations to create tables
// ----------------------
try {
  console.log('Running migrations (require ./db/migrate)...');
  require('./db/migrate');
  console.log('Migrations finished (or already applied).');
} catch (err) {
  console.error('❌ Migration error:', err && err.stack ? err.stack : err);
  process.exit(1);
}

const PORT = process.env.PORT || 3001;

// At the very top, after migrations
require('./db/seed-admin-render'); // <- this runs the auto-seed script

app.listen(PORT, () => {
  console.log(`✅ TW Connect API running on port ${PORT}`);
});

// log unhandled rejections / exceptions
process.on('uncaughtException', (err) => {
  console.error('uncaughtException', err && err.stack ? err.stack : err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection', reason && reason.stack ? reason.stack : reason);
  process.exit(1);
});

// ----------------------
// Start the server
// ----------------------
try {
  app.listen(PORT, () => {
    console.log(`\n✅ TW Connect API running on port ${PORT}`);
    console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Database    : ${dbPath}\n`);
  });
} catch (err) {
  console.error('❌ Server failed to start:', err && err.stack ? err.stack : err);
  process.exit(1);
}