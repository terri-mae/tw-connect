const app  = require('./app');
const path = require('path');

// Ensure DB is migrated on startup
require('./db/migrate');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`\n✅  TW Connect API running on port ${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Database    : ${path.resolve(__dirname, '..', '..', 'database', 'twconnect.db')}\n`);
});
