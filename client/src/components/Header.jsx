import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { api } from '../lib/api';

export default function Header({ title, actions }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen]       = useState(false);
  const searchRef = useRef(null);
  const navigate  = useNavigate();

  // Global keyboard shortcut: ⌘K / Ctrl+K to focus search
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      try {
        const data = await api.contacts.search(query);
        setResults(data.results || []);
        setOpen(true);
      } catch { setResults([]); }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  function goToContact(id) {
    setQuery('');
    setResults([]);
    setOpen(false);
    navigate(`/contacts/${id}`);
  }

  return (
    <header className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center gap-4 px-6 shrink-0">
      {/* Page title */}
      <h1 className="text-sm font-semibold text-zinc-100 mr-auto">{title}</h1>

      {/* Global search */}
      <div className="relative" style={{ width: 260 }}>
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search contacts…"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-12 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.6rem] text-zinc-500 bg-zinc-700 border border-zinc-600 rounded px-1">
          ⌘K
        </kbd>

        {/* Dropdown results */}
        {open && results.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden">
            {results.map(r => (
              <button
                key={r.id}
                onMouseDown={() => goToContact(r.id)}
                className="w-full flex flex-col items-start px-3 py-2 hover:bg-zinc-800 transition-colors"
              >
                <span className="text-sm font-medium text-zinc-200">
                  {r.first_name} {r.last_name}
                </span>
                <span className="text-xs text-zinc-500">
                  {r.job_title ? `${r.job_title} · ` : ''}{r.company_name || ''}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Page-specific actions */}
      {actions}
    </header>
  );
}

/** Reusable "Add" button for header actions */
export function AddButton({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-md shadow-indigo-500/20"
    >
      <Plus size={14} />
      {label}
    </button>
  );
}
