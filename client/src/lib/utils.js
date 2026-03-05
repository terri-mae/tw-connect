import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Format ISO date → dd/mm/yyyy */
export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-GB'); // dd/mm/yyyy
}

/** Format ISO datetime → dd/mm/yyyy HH:mm */
export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/** Today's date as YYYY-MM-DD (for date inputs) */
export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

/** Today's date as dd/mm/yyyy */
export function todayDisplay() {
  return formatDate(todayISO());
}

/** Days since a date string (YYYY-MM-DD or ISO) */
export function daysSince(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86_400_000);
}

/** Initials from first + last name */
export function initials(firstName, lastName) {
  return `${(firstName?.[0] || '').toUpperCase()}${(lastName?.[0] || '').toUpperCase()}`;
}

/** Capitalise first letter */
export function capitalise(str) {
  if (!str) return '';
  return str[0].toUpperCase() + str.slice(1);
}

/** Method label → display label */
export const METHOD_LABELS = {
  email:    'Email',
  phone:    'Phone',
  linkedin: 'LinkedIn',
  whatsapp: 'WhatsApp',
  meeting:  'Meeting',
  other:    'Other',
};

/** Method → Tailwind colour classes */
export const METHOD_COLORS = {
  email:    { bg: 'bg-blue-500/15',   text: 'text-blue-400',   icon: '#60a5fa' },
  phone:    { bg: 'bg-green-500/15',  text: 'text-green-400',  icon: '#4ade80' },
  linkedin: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', icon: '#818cf8' },
  whatsapp: { bg: 'bg-amber-500/15',  text: 'text-amber-400',  icon: '#fbbf24' },
  meeting:  { bg: 'bg-purple-500/15', text: 'text-purple-400', icon: '#c084fc' },
  other:    { bg: 'bg-zinc-500/15',   text: 'text-zinc-400',   icon: '#a1a1aa' },
};

/** Status → badge config */
export const STATUS_CONFIG = {
  active:         { label: 'Active',          className: 'bg-emerald-500/15 text-emerald-400' },
  cold:           { label: 'Cold',            className: 'bg-blue-500/15 text-blue-400' },
  do_not_contact: { label: 'Do Not Contact',  className: 'bg-red-500/15 text-red-400' },
};
