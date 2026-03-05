/**
 * API client — thin wrapper around fetch.
 * All requests include credentials (httpOnly cookie).
 */

// ✅ Use VITE_API_BASE for Render, fallback to local dev
const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include', // send cookies
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // 204 No Content
  if (res.status === 204) return null;

  // Try parse JSON, else return error object
  const data = await res.json().catch(() => ({ error: 'Unexpected server response' }));

  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return data;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    // login expects { email, password }
    login:  (body) => request('/auth/login',  { method: 'POST', body }),
    logout: ()      => request('/auth/logout', { method: 'POST' }),
    me:     ()      => request('/auth/me'),
  },

  users: {
    list:          ()         => request('/users'),
    get:           (id)       => request(`/users/${id}`),
    create:        (body)     => request('/users',              { method: 'POST',  body }),
    update:        (id, body) => request(`/users/${id}`,        { method: 'PATCH', body }),
    resetPassword: (id, body) => request(`/users/${id}/reset-password`, { method: 'POST', body }),
    activityLog:   (page=1)   => request(`/users/admin/activity-log?page=${page}`),
  },

  companies: {
    list:   (params = {}) => request(`/companies?${new URLSearchParams(params)}`),
    all:    ()            => request('/companies/all'),
    get:    (id)          => request(`/companies/${id}`),
    create: (body)        => request('/companies',      { method: 'POST',  body }),
    update: (id, body)    => request(`/companies/${id}`, { method: 'PATCH', body }),
    delete: (id)          => request(`/companies/${id}`, { method: 'DELETE' }),
  },

  contacts: {
    list:   (params = {}) => request(`/contacts?${new URLSearchParams(params)}`),
    search: (q)           => request(`/contacts/search?q=${encodeURIComponent(q)}`),
    get:    (id)          => request(`/contacts/${id}`),
    create: (body)        => request('/contacts',      { method: 'POST',  body }),
    update: (id, body)    => request(`/contacts/${id}`, { method: 'PATCH', body }),
    delete: (id)          => request(`/contacts/${id}`, { method: 'DELETE' }),
    import: (rows)        => request('/contacts/import', { method: 'POST', body: { rows } }),
  },

  interactions: {
    list:   (params = {}) => request(`/interactions?${new URLSearchParams(params)}`),
    create: (body)        => request('/interactions',       { method: 'POST',  body }),
    update: (id, body)    => request(`/interactions/${id}`, { method: 'PATCH', body }),
    delete: (id)          => request(`/interactions/${id}`, { method: 'DELETE' }),
  },

  dashboard: {
    summary:     ()  => request('/dashboard'),
    credentials: ()  => request('/dashboard/credentials'),
  },
};