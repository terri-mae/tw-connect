require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');

const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const companiesRouter = require('./routes/companies');
const contactsRouter = require('./routes/contacts');
const interactionsRouter = require('./routes/interactions');
const dashboardRouter = require('./routes/dashboard');

const app = express();

// ── Trust proxy (needed when behind Render/Nginx)
app.set('trust proxy', 1);

// ── CORS ─────────────────────────────────────
app.use(cors({
   origin: 'https://connect.tenacityworks.com',
  credentials: true
}));

// ── Body parsing & cookies ───────────────────
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// ── Rate limiting ────────────────────────────
app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter);

// ── API routes ───────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/interactions', interactionsRouter);
app.use('/api/dashboard', dashboardRouter);

// ── Health check ─────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('✅ TW Connect API is running on Render!');
});

// ── Error handler ────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

module.exports = app;