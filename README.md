# TW Connect

A production-ready, self-hosted CRM for small digital agencies. Built for Tenacity Works.

## Features

- **Contacts** — full CRUD, status tracking, tags, notes, CSV import with field mapping
- **Companies** — linked to contacts with a merged interaction timeline
- **Interactions** — log emails, calls, LinkedIn, WhatsApp, meetings; credentials deck tracking
- **Credentials Deck** — track which contacts have received your agency's deck
- **Dashboard** — stats, charts (contacts by owner, deck sent %), recent activity, follow-up alerts
- **Team Management** — Admin/Member roles, password reset, activate/deactivate users
- **Activity Log** — audit trail of all create/update/delete actions

## Tech Stack

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Frontend  | React 18, Vite 5, Tailwind CSS 3, Lucide      |
| Charts    | Chart.js 4 + react-chartjs-2                  |
| Backend   | Node.js 20, Express 4                         |
| Database  | SQLite via better-sqlite3 (WAL mode)          |
| Auth      | JWT in httpOnly cookies, bcrypt (rounds=12)   |
| Security  | Rate limiting, brute-force lockout, CORS      |

## Quick Start (Development)

```bash
# 1. Clone / copy the project
cd tw-connect

# 2. Install everything (root + server + client)
npm install && npm run install:all

# 3. Configure environment
cp .env.example .env
# Edit .env — set JWT_SECRET at minimum

# 4. Create your first admin account
npm run seed:admin

# 5. Start both servers with one command
npm run dev
# API runs on :3001  |  React runs on :5173
# Open http://localhost:5173
```

## Project Structure

```
tw-connect/
├── client/              React + Vite frontend
│   └── src/
│       ├── components/  Shared UI components & modals
│       ├── hooks/       useAuth, useToast
│       ├── lib/         api.js, utils.js
│       └── pages/       One file per route
├── server/              Express API
│   └── src/
│       ├── db/          database.js, migrate.js, seed-admin.js
│       ├── middleware/  auth.js, rateLimiter.js, activityLogger.js
│       ├── routes/      auth, users, companies, contacts, interactions, dashboard
│       └── validators/  input validation helpers
├── database/            SQLite file (auto-created on first run)
├── install/             nginx.conf reference
├── .env.example         Environment variable template
├── INSTALL.md           Full production install guide
└── README.md            This file
```

## Environment Variables

See `.env.example` for all variables with descriptions.

| Variable        | Required | Default               | Description                    |
|-----------------|----------|-----------------------|--------------------------------|
| `JWT_SECRET`    | Yes      | —                     | Long random string for JWTs    |
| `PORT`          | No       | `3001`                | Express listen port            |
| `NODE_ENV`      | No       | `development`         | `development` or `production`  |
| `CLIENT_ORIGIN` | No       | `http://localhost:5173` | CORS allowed origin          |
| `SESSION_HOURS` | No       | `8`                   | JWT expiry in hours            |

## API Overview

All API routes are under `/api`. The frontend proxies `/api` in development.

| Method | Path                          | Auth     | Description                     |
|--------|-------------------------------|----------|---------------------------------|
| POST   | /api/auth/login               | Public   | Login, sets httpOnly cookie     |
| POST   | /api/auth/logout              | Auth     | Clears cookie                   |
| GET    | /api/auth/me                  | Auth     | Current user info               |
| GET    | /api/contacts                 | Auth     | List with filters & pagination  |
| POST   | /api/contacts                 | Auth     | Create contact                  |
| GET    | /api/contacts/:id             | Auth     | Contact + interactions          |
| PATCH  | /api/contacts/:id             | Auth     | Update contact                  |
| DELETE | /api/contacts/:id             | Auth     | Delete contact                  |
| POST   | /api/contacts/import          | Auth     | Bulk CSV import                 |
| GET    | /api/companies                | Auth     | List companies                  |
| POST   | /api/companies                | Auth     | Create company                  |
| GET    | /api/companies/:id            | Auth     | Company + contacts + timeline   |
| PATCH  | /api/companies/:id            | Auth     | Update company                  |
| DELETE | /api/companies/:id            | Auth     | Delete company                  |
| GET    | /api/interactions             | Auth     | List interactions               |
| POST   | /api/interactions             | Auth     | Log interaction                 |
| PATCH  | /api/interactions/:id         | Auth     | Edit interaction (own or admin) |
| DELETE | /api/interactions/:id         | Auth     | Delete interaction              |
| GET    | /api/dashboard                | Auth     | Stats + chart data              |
| GET    | /api/dashboard/credentials    | Auth     | Credentials deck tracking       |
| GET    | /api/users                    | Auth     | List users (admin sees all)     |
| POST   | /api/users                    | Admin    | Create user                     |
| PATCH  | /api/users/:id                | Auth     | Update user                     |
| POST   | /api/users/:id/reset-password | Admin    | Force password reset            |
| GET    | /api/users/admin/activity-log | Admin    | Paginated audit log             |

## Security Notes

- Passwords: bcrypt with 12 rounds, minimum 10 characters
- Sessions: JWT in `httpOnly`, `sameSite: strict` cookies — not accessible from JS
- Brute force: 5 failed logins → 15-minute lockout per account
- Rate limiting: 20 requests/15 min on auth endpoints, 200 req/min on general API
- All DB queries use parameterised statements (no SQL injection)
- CORS restricted to `CLIENT_ORIGIN`

## Production Deployment

See **INSTALL.md** for the full step-by-step guide covering PM2, Nginx, SSL, and backups.
