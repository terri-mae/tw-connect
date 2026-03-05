require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const express      = require('express');
const cookieParser = require('cookie-parser');
const cors         = require('cors');
const path         = require('path');

const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');

const authRouter         = require('./routes/auth');
const usersRouter        = require('./routes/users');
const companiesRouter    = require('./routes/companies');
const contactsRouter     = require('./routes/contacts');
const interactionsRouter = require('./routes/interactions');
const dashboardRouter    = require('./routes/dashboard');

const app = express();

// ── Trust proxy (needed when behind Nginx) ───────────────────────────────────
app.set('trust proxy', 1);

// ── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map(s => s.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

// ── Body parsing & cookies ───────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// ── Rate limiting ────────────────────────────────────────────────────────────
app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter);

// ── API routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',         authRouter);
app.use('/api/users',        usersRouter);
app.use('/api/companies',    companiesRouter);
app.use('/api/contacts',     contactsRouter);
app.use('/api/interactions', interactionsRouter);
app.use('/api/dashboard',    dashboardRouter);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Health check / root message
app.get('/', (req, res) => {
  res.send('✅ TW Connect API is running on Render!');
});

// Optional: keep /api/health for automated checks
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ── Serve React build in production ─────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
