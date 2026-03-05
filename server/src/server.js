// server/src/server.js
const app = require('./app');
const path = require('path');
const fs = require('fs');

// ----------------------
// Ensure DB folder and file exist
// ----------------------
const dbPath = path.resolve(__dirname, '..', '..', 'database', 'twconnect.db');
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, ''); // create empty DB file
  console.log('✅ Created empty database file');
}

// ----------------------
// Run migrations to create tables
// ----------------------
require('./db/migrate');

const PORT = process.env.PORT || 3001;

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
  console.error('❌ Server failed to start:', err);
}