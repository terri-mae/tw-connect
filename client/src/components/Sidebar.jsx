import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, Activity,
  FileCheck, Settings, LogOut,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

const NAV = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/contacts',    icon: Users,            label: 'Contacts' },
  { to: '/companies',   icon: Building2,        label: 'Companies' },
  { to: '/credentials', icon: FileCheck,        label: 'Credentials' },
];

const SETTINGS_NAV = [
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    toast({ title: 'Signed out' });
    navigate('/login');
  }

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-indigo-500/15 text-indigo-400'
        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
    }`;

  return (
    <aside
      style={{ width: 220 }}
      className="fixed inset-y-0 left-0 flex flex-col bg-zinc-900 border-r border-zinc-800 shrink-0"
    >
      {/* Logo */}
      <div className="px-4 py-5 border-b border-zinc-800">
        <span className="text-sm font-bold text-zinc-100 tracking-tight">
          TW<span className="text-indigo-400"> Connect</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={linkClass}>
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
        <div className="pt-4 mt-4 border-t border-zinc-800">
          {SETTINGS_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={linkClass}>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-zinc-800">
        <div className="flex items-center gap-2.5 px-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <span className="text-[0.6rem] font-bold text-indigo-400">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-200 truncate">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-[0.65rem] text-zinc-500 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-zinc-800">
        <p className="text-[0.6rem] text-zinc-600">TW Connect. Built for Tenacity Works.</p>
      </div>
    </aside>
  );
}
