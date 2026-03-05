# TW Connect — Developer Guide

Everything you need to understand the codebase, set up your local environment, and start building.

---

## Table of Contents

1. [Local Setup](#1-local-setup)
2. [Project Structure](#2-project-structure)
3. [Architecture Overview](#3-architecture-overview)
4. [Database Schema](#4-database-schema)
5. [API Conventions](#5-api-conventions)
6. [Authentication & Sessions](#6-authentication--sessions)
7. [Frontend Patterns](#7-frontend-patterns)
8. [Common Dev Tasks](#8-common-dev-tasks)
9. [Environment Variables](#9-environment-variables)

---

## 1. Local Setup

**Prerequisites:** Node.js 20+, npm 10+

```bash
# Clone / copy the repo
cd tw-connect

# Install all dependencies (root, server, and client)
npm install && npm run install:all

# Create your environment file
cp .env.example .env
# At minimum, set JWT_SECRET to any long random string for local dev:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Create the first admin account (interactive prompt)
npm run seed:admin

# Start both servers
npm run dev
```

| Process | URL                   |
|---------|-----------------------|
| React   | http://localhost:5173 |
| API     | http://localhost:3001 |

The React dev server proxies all `/api` requests to `:3001`, so you only ever open `:5173`.

---

## 2. Project Structure

```
tw-connect/
│
├── client/                     React + Vite SPA
│   ├── index.html              Entry HTML (sets html class="dark", loads Inter font)
│   ├── vite.config.js          @ path alias, /api proxy to :3001
│   ├── tailwind.config.js      Dark-mode config, CSS variable colour tokens
│   └── src/
│       ├── main.jsx            ReactDOM.createRoot entry point
│       ├── App.jsx             BrowserRouter + route definitions + auth guards
│       ├── index.css           CSS custom properties (dark theme tokens)
│       │
│       ├── lib/
│       │   ├── api.js          All fetch calls — single source of truth for the API
│       │   └── utils.js        cn(), formatDate(), METHOD_LABELS/COLORS, STATUS_CONFIG
│       │
│       ├── hooks/
│       │   ├── useAuth.jsx     AuthContext — user state, login(), logout()
│       │   └── useToast.jsx    ToastContext — toast(options) helper
│       │
│       ├── components/
│       │   ├── Layout.jsx      Sidebar + <Outlet /> (React Router nested routes)
│       │   ├── Sidebar.jsx     Fixed 220px nav, user info, logout
│       │   ├── Header.jsx      Page title, global search (⌘K), AddButton export
│       │   ├── ContactModal.jsx    Add / Edit contact
│       │   ├── InteractionModal.jsx  Log / Edit interaction
│       │   ├── CompanyModal.jsx    Add / Edit company
│       │   ├── CsvImportModal.jsx  3-step CSV import with field mapping
│       │   └── ui/
│       │       ├── Badge.jsx       Colour-variant badge
│       │       ├── Button.jsx      Primary / secondary / ghost / destructive
│       │       ├── Input.jsx       Input, Select, Textarea with label + error
│       │       ├── Modal.jsx       Modal + ConfirmDialog
│       │       ├── EmptyState.jsx  Centred icon/title/description
│       │       └── Pagination.jsx  Page range + prev/next
│       │
│       └── pages/
│           ├── Login.jsx
│           ├── Dashboard.jsx
│           ├── Contacts.jsx
│           ├── ContactDetail.jsx
│           ├── Companies.jsx
│           ├── CompanyDetail.jsx
│           ├── Credentials.jsx
│           └── Settings.jsx       Admin only — team management + activity log
│
├── server/
│   └── src/
│       ├── app.js              Express app (CORS, middleware, routes, error handler)
│       ├── server.js           Runs migrations, calls app.listen()
│       │
│       ├── db/
│       │   ├── database.js     SQLite singleton (WAL mode, foreign keys ON)
│       │   ├── migrate.js      CREATE TABLE IF NOT EXISTS for all tables
│       │   └── seed-admin.js   Interactive CLI to create the first admin user
│       │
│       ├── middleware/
│       │   ├── auth.js         requireAuth (JWT cookie), requireAdmin (role check)
│       │   ├── rateLimiter.js  authLimiter (20/15min), apiLimiter (200/1min)
│       │   └── activityLogger.js  logActivity() — writes to activity_log table
│       │
│       ├── routes/
│       │   ├── auth.js         POST /login, POST /logout, GET /me
│       │   ├── users.js        Team management (admin-gated)
│       │   ├── companies.js    Company CRUD
│       │   ├── contacts.js     Contact CRUD + search + CSV import
│       │   ├── interactions.js Interaction CRUD
│       │   └── dashboard.js    Stats, chart data, credentials tracking
│       │
│       └── validators/
│           └── index.js        validateContact/Company/Interaction/User, parsePagination
│
├── database/                   SQLite .db file lives here (git-ignored)
├── install/
│   └── nginx.conf              Reference Nginx config for production
├── mockups/                    8 standalone HTML mockups (design reference)
├── .env.example                All env vars with descriptions
├── .gitignore
├── package.json                Root — `npm run dev` starts both servers via concurrently
├── README.md
├── INSTALL.md                  Production deploy guide (PM2, Nginx, SSL, backups)
└── DEVELOPER.md                This file
```

---

## 3. Architecture Overview

```
Browser
  │  httpOnly cookie (twc_token)
  ▼
React SPA (Vite :5173 in dev / Nginx in prod)
  │  fetch /api/* with credentials: 'include'
  ▼
Express API (:3001)
  │  jwt.verify(cookie) → req.user
  ▼
better-sqlite3  →  twconnect.db (WAL mode)
```

**Key design decisions:**

- **No localStorage for auth.** The JWT lives in an `httpOnly; sameSite=strict` cookie, so it's invisible to JavaScript. This eliminates XSS token theft.
- **SQLite over Postgres.** This is a small team app (~10 users, ~10k contacts). SQLite in WAL mode handles concurrent reads well and removes infrastructure complexity. Swap out `database.js` if you ever need to scale.
- **better-sqlite3 (synchronous).** All DB calls are synchronous, which is fine for a single-process Node app on SQLite. No async/await needed in route handlers for DB work.
- **One CSS file for the whole theme.** All colour tokens are CSS custom properties in `index.css`. Tailwind classes reference these via `tailwind.config.js`. Dark mode is permanently on (`html class="dark"` in `index.html`) — there is no light mode toggle.

---

## 4. Database Schema

```sql
-- Users (team members)
CREATE TABLE users (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  email                  TEXT UNIQUE NOT NULL,
  password_hash          TEXT NOT NULL,
  first_name             TEXT NOT NULL,
  last_name              TEXT NOT NULL,
  role                   TEXT NOT NULL DEFAULT 'member',  -- 'admin' | 'member'
  status                 TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'inactive'
  failed_login_attempts  INTEGER NOT NULL DEFAULT 0,
  locked_until           INTEGER,          -- Unix timestamp (ms), NULL = not locked
  last_login             INTEGER,          -- Unix timestamp (ms)
  created_at             INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

-- Companies
CREATE TABLE companies (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  industry   TEXT,
  website    TEXT,
  phone      TEXT,
  location   TEXT,
  notes      TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

-- Contacts
CREATE TABLE contacts (
  id                          INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name                  TEXT NOT NULL,
  last_name                   TEXT NOT NULL,
  email                       TEXT,
  phone                       TEXT,
  company_id                  INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  job_title                   TEXT,
  linkedin_url                TEXT,
  location                    TEXT,
  status                      TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'inactive' | 'lead'
  notes                       TEXT,
  owner_id                    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  credentials_deck_sent       INTEGER NOT NULL DEFAULT 0,  -- boolean (0/1)
  credentials_deck_sent_date  INTEGER,                     -- Unix timestamp (ms)
  created_by                  INTEGER REFERENCES users(id),
  created_at                  INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

-- Tags (many-to-one on contacts)
CREATE TABLE contact_tags (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag        TEXT NOT NULL
);

-- Interactions
CREATE TABLE interactions (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id            INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  logged_by             INTEGER REFERENCES users(id) ON DELETE SET NULL,
  method                TEXT NOT NULL,  -- 'email'|'phone'|'linkedin'|'whatsapp'|'meeting'|'other'
  summary               TEXT NOT NULL,
  notes                 TEXT,
  interaction_date      INTEGER NOT NULL,   -- Unix timestamp (ms)
  credentials_deck_sent INTEGER NOT NULL DEFAULT 0,
  created_at            INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

-- Activity log (audit trail)
CREATE TABLE activity_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,        -- e.g. 'create', 'update', 'delete'
  entity_type TEXT NOT NULL,        -- e.g. 'contact', 'company', 'interaction'
  entity_id   INTEGER,
  details     TEXT,                 -- JSON string with before/after or description
  created_at  INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);
```

**Timestamps** are stored as Unix milliseconds (INTEGER). The `formatDate()` / `formatDateTime()` helpers in `client/src/lib/utils.js` convert them to `dd/mm/yyyy` for display.

**Tags** are stored normalised in `contact_tags` (not as a comma-separated string in contacts). The route layer uses a `setTags(contactId, tagsArray)` helper that deletes all existing tags for a contact and re-inserts in one transaction.

---

## 5. API Conventions

### Base URL
All routes are under `/api`. In development Vite proxies them automatically.

### Response shape

**Success:**
```json
{ "contact": { ... } }          // single resource
{ "contacts": [...], "total": 42, "page": 1, "totalPages": 2 }  // list
{ "message": "Deleted" }        // mutations with no body to return
```

**Error:**
```json
{ "error": "Human-readable message" }
```

HTTP status codes follow REST conventions: `200`, `201`, `400`, `401`, `403`, `404`, `409`, `422`, `500`.

### Pagination
List endpoints accept `?page=1&limit=25`. The `parsePagination()` helper normalises these and enforces a max of 100 per page. Response always includes `total` and `totalPages`.

### Filters (contacts)
`GET /api/contacts` accepts:

| Param       | Example              | Notes                              |
|-------------|----------------------|------------------------------------|
| `search`    | `?search=alice`      | Searches name, email, phone, company |
| `owner_id`  | `?owner_id=3`        | Filter by assigned team member     |
| `status`    | `?status=lead`       | active / inactive / lead           |
| `deck_sent` | `?deck_sent=0`       | 0 or 1                             |
| `tag`       | `?tag=warm-lead`     | Exact tag match                    |
| `sort`      | `?sort=last_interaction` | name / company / last_interaction / created |
| `dir`       | `?dir=asc`           | asc / desc                         |

### Adding a new route

1. Create (or add to) a file in `server/src/routes/`
2. Mount it in `server/src/app.js`: `app.use('/api/things', thingsRouter)`
3. Add the corresponding `api.things.*` methods in `client/src/lib/api.js`

---

## 6. Authentication & Sessions

### Flow

```
POST /api/auth/login  { email, password }
  → validates credentials
  → on success: issues JWT in Set-Cookie: twc_token (httpOnly, sameSite=strict, 8h)
  → returns { user: { id, email, first_name, last_name, role } }

GET /api/auth/me
  → reads cookie, verifies JWT, returns current user
  → called by AuthProvider on every page load to restore session

POST /api/auth/logout
  → clears the cookie
```

### Brute-force protection

After **5 failed logins**, the account is locked for **15 minutes**. Implemented via `failed_login_attempts` and `locked_until` columns in `users`. Both reset to zero on a successful login.

### Protecting a route (backend)

```js
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/my-route', requireAuth, (req, res) => {
  // req.user is available here
});

router.delete('/admin-only', requireAuth, requireAdmin, (req, res) => { ... });
```

### Protecting a route (frontend)

Route guards live in `App.jsx`:
- `<PrivateRoute>` — redirects to `/login` if no session
- `<AdminRoute>` — redirects to `/` if not admin
- `<PublicRoute>` — redirects to `/` if already logged in (login page)

---

## 7. Frontend Patterns

### API calls

All API calls go through `client/src/lib/api.js`. Never call `fetch` directly in a component.

```js
import { api } from '../lib/api';

// In a component or useEffect:
const { contacts, total } = await api.contacts.list({ search: 'alice', page: 2 });
```

The `request()` wrapper automatically:
- Sends `credentials: 'include'` (so the cookie is sent)
- Throws an `Error` with `err.message` set to the API's `{ error }` value on non-2xx responses
- Handles JSON parsing

### Toasts

```js
import { useToast } from '../hooks/useToast';

const { toast } = useToast();

toast({ title: 'Contact saved', variant: 'success' });
toast({ title: 'Something went wrong', description: err.message, variant: 'error' });
```

Variants: `default`, `success`, `error`, `warning`.

### Modals

All shared modals accept `open`, `onClose`, `onSaved` (or `onDone`) props.

```jsx
const [contactModalOpen, setContactModalOpen] = useState(false);
const [editingContact, setEditingContact] = useState(null);

<ContactModal
  open={contactModalOpen}
  onClose={() => { setContactModalOpen(false); setEditingContact(null); }}
  onSaved={contact => {
    // update local state / refetch list
    setContactModalOpen(false);
  }}
  contact={editingContact}  // null = add mode, object = edit mode
/>
```

### Colour / style helpers

```js
import { METHOD_COLORS, STATUS_CONFIG, formatDate } from '../lib/utils';

// Method badge colours
const { bg, text } = METHOD_COLORS['email'];   // bg-blue-500/15, text-blue-400

// Status badge
const { label, className } = STATUS_CONFIG['lead'];  // 'Lead', 'text-amber-400 ...'

// Dates display as dd/mm/yyyy
formatDate(contact.created_at);  // "04/03/2026"
```

### Keyboard shortcuts

- **N** — opens Add Contact modal (fires in `Contacts.jsx`, ignored if focus is in an input)
- **⌘K** / **Ctrl+K** — focuses the global search bar in `Header.jsx`

---

## 8. Common Dev Tasks

### Add a field to contacts

1. **Migration** — add the column in `server/src/db/migrate.js` using `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` syntax (or add to the CREATE TABLE if starting fresh).
2. **Validator** — update `validateContact` in `server/src/validators/index.js`.
3. **Route** — include the field in the SELECT queries and INSERT/UPDATE in `server/src/routes/contacts.js`.
4. **Modal** — add the input to `client/src/components/ContactModal.jsx`.
5. **Detail page** — add an `InfoRow` in `client/src/pages/ContactDetail.jsx` if it should be visible.

### Add a new interaction method

1. Add the value to `METHOD_OPTIONS` in `InteractionModal.jsx`.
2. Add colours to `METHOD_COLORS` in `utils.js`.
3. Add the label to `METHOD_LABELS` in `utils.js`.

### Reset the database (dev only)

```bash
rm database/twconnect.db
npm run dev   # migrations run automatically on startup
npm run seed:admin
```

### Inspect the database

```bash
# SQLite CLI
sqlite3 database/twconnect.db

# Useful queries
.tables
SELECT * FROM users;
SELECT c.first_name, c.last_name, co.name FROM contacts c LEFT JOIN companies co ON c.company_id = co.id LIMIT 10;
.quit
```

Or use a GUI like [DB Browser for SQLite](https://sqlitebrowser.org/) — just open `database/twconnect.db`.

### View server logs

In development, Express logs to stdout via `nodemon`. PM2 is used in production:

```bash
pm2 logs tw-connect          # stream live
pm2 logs tw-connect --lines 100
```

---

## 9. Environment Variables

| Variable        | Required | Default                 | Description                                    |
|-----------------|----------|-------------------------|------------------------------------------------|
| `JWT_SECRET`    | **Yes**  | —                       | Secret for signing JWTs. Use a 64-char random string. |
| `PORT`          | No       | `3001`                  | Port the Express server listens on             |
| `NODE_ENV`      | No       | `development`           | Set to `production` in production              |
| `CLIENT_ORIGIN` | No       | `http://localhost:5173` | CORS allowed origin (comma-separate for multiple) |
| `SESSION_HOURS` | No       | `8`                     | JWT expiry in hours                            |

Generate a strong `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
