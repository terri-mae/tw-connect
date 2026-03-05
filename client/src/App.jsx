import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import Layout from './components/Layout';

import Login        from './pages/Login';
import Dashboard    from './pages/Dashboard';
import Contacts     from './pages/Contacts';
import ContactDetail from './pages/ContactDetail';
import Companies    from './pages/Companies';
import CompanyDetail from './pages/CompanyDetail';
import Credentials  from './pages/Credentials';
import Settings     from './pages/Settings';

/* ── Sets the document title for each route ── */
const PAGE_TITLES = {
  '/':            'Dashboard',
  '/contacts':    'Contacts',
  '/companies':   'Companies',
  '/credentials': 'Credentials',
  '/settings':    'Settings',
};

function TitleUpdater() {
  const { pathname } = useLocation();
  useEffect(() => {
    const base = 'TW Connect';
    const page = Object.entries(PAGE_TITLES).find(([path]) => pathname === path
      || (path !== '/' && pathname.startsWith(path)))?.[1];
    document.title = page ? `${page} — ${base}` : base;
  }, [pathname]);
  return null;
}

/* ── Redirect to /login if not authenticated ── */
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-zinc-500">Loading…</span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/* ── Redirect logged-in users away from /login ── */
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

/* ── Admin-only guard ── */
function AdminRoute({ children }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <>
      <TitleUpdater />
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Protected — wrapped in shared Layout */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="contacts"         element={<Contacts />} />
          <Route path="contacts/:id"     element={<ContactDetail />} />
          <Route path="companies"        element={<Companies />} />
          <Route path="companies/:id"    element={<CompanyDetail />} />
          <Route path="credentials"      element={<Credentials />} />
          <Route
            path="settings"
            element={
              <AdminRoute>
                <Settings />
              </AdminRoute>
            }
          />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
