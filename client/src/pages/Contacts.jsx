import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, CheckCircle2, Minus, Pencil, Plus, Upload, Search,
} from 'lucide-react';
import Layout from '../components/Layout';
import Header, { AddButton } from '../components/Header';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState } from '../components/ui/EmptyState';
import ContactModal from '../components/ContactModal';
import InteractionModal from '../components/InteractionModal';
import CsvImportModal from '../components/CsvImportModal';
import { api } from '../lib/api';
import { formatDate, daysSince, initials, STATUS_CONFIG } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';

const SORT_OPTIONS = [
  { value: 'name',             label: 'Name' },
  { value: 'company',          label: 'Company' },
  { value: 'last_interaction', label: 'Last interaction' },
  { value: 'created',          label: 'Date added' },
];

export default function Contacts() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [contacts, setContacts]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(1);
  const [loading, setLoading]     = useState(true);
  const [users, setUsers]         = useState([]);

  // Filters
  const [search, setSearch]     = useState('');
  const [ownerId, setOwnerId]   = useState('');
  const [status, setStatus]     = useState('');
  const [deckSent, setDeckSent] = useState('');
  const [tag, setTag]           = useState('');
  const [sort, setSort]         = useState('name');

  // Modals
  const [addOpen, setAddOpen]         = useState(false);
  const [editContact, setEditContact] = useState(null);
  const [logFor, setLogFor]           = useState(null);
  const [importOpen, setImportOpen]   = useState(false);

  const fetchContacts = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 25, sort };
      if (search)   params.search   = search;
      if (ownerId)  params.owner_id = ownerId;
      if (status)   params.status   = status;
      if (deckSent !== '') params.deck_sent = deckSent;
      if (tag)      params.tag      = tag;
      const data = await api.contacts.list(params);
      setContacts(data.contacts);
      setTotal(data.total);
      setPages(data.pages);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, [search, ownerId, status, deckSent, tag, sort, page]);

  useEffect(() => {
    api.users.list().then(d => setUsers(d.users)).catch(() => {});
  }, []);

  useEffect(() => { fetchContacts(1); }, [search, ownerId, status, deckSent, tag, sort]);

  // Global N keyboard shortcut → Add Contact
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) {
        setAddOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filterSelect = 'bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-indigo-500 appearance-none';

  return (
    <Layout>
      <Header
        title="Contacts"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Upload size={13} /> Import CSV
            </button>
            <AddButton label="Add Contact" onClick={() => setAddOpen(true)} />
          </div>
        }
      />

      {/* Filter bar */}
      <div className="px-6 py-3 border-b border-zinc-800 flex items-center gap-3 flex-wrap bg-zinc-900">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter by name, email, company…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-500 outline-none focus:border-indigo-500 w-56"
          />
        </div>

        <select className={filterSelect} value={ownerId} onChange={e => setOwnerId(e.target.value)}>
          <option value="">All owners</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.first_name} {u.last_name}{u.id === user?.id ? ' (me)' : ''}
            </option>
          ))}
        </select>

        <select className={filterSelect} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="cold">Cold</option>
          <option value="do_not_contact">Do Not Contact</option>
        </select>

        <select className={filterSelect} value={deckSent} onChange={e => setDeckSent(e.target.value)}>
          <option value="">Deck: all</option>
          <option value="true">Deck sent</option>
          <option value="false">Deck not sent</option>
        </select>

        <input
          type="text"
          placeholder="Tag…"
          value={tag}
          onChange={e => setTag(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-500 outline-none focus:border-indigo-500 w-28"
        />

        <div className="ml-auto">
          <select className={filterSelect} value={sort} onChange={e => setSort(e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-xs text-zinc-500">Loading…</p>
          </div>
        ) : contacts.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No contacts found"
            description="Try adjusting your filters or add a new contact."
            action={<button onClick={() => setAddOpen(true)} className="text-xs text-indigo-400 hover:text-indigo-300">+ Add Contact</button>}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="text-left px-4 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider w-8">
                  <input type="checkbox" className="accent-indigo-600" />
                </th>
                <th className="text-left px-4 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">Name / Company</th>
                <th className="text-left px-4 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">Owner</th>
                <th className="text-left px-4 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">Last Interaction</th>
                <th className="text-center px-4 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">Deck</th>
                <th className="text-right px-4 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => {
                const days = daysSince(c.last_interaction_date);
                const overdue = days === null || days > 30;
                const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.active;

                return (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/contacts/${c.id}`)}
                    className="border-b border-zinc-800/60 hover:bg-zinc-900/60 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="accent-indigo-600" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
                          <span className="text-[0.55rem] font-bold text-indigo-400">
                            {initials(c.first_name, c.last_name)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-200">{c.first_name} {c.last_name}</p>
                          <p className="text-xs text-zinc-500">{c.company_name || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center">
                          <span className="text-[0.5rem] font-bold text-zinc-300">
                            {c.owner_name?.split(' ').map(n => n[0]).join('') || '?'}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-400">{c.owner_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sc.className}`}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${overdue ? 'text-red-400' : 'text-zinc-400'}`}>
                        {c.last_interaction_date ? formatDate(c.last_interaction_date) : 'Never'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.credentials_deck_sent ? (
                        <CheckCircle2 size={16} className="text-indigo-400 mx-auto" />
                      ) : (
                        <Minus size={16} className="text-zinc-600 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Log interaction"
                          onClick={() => setLogFor(c)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                        >
                          <Plus size={13} />
                        </button>
                        <button
                          title="Edit contact"
                          onClick={() => setEditContact(c)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <Pagination page={page} pages={pages} total={total} limit={25} onPage={p => fetchContacts(p)} />
      </div>

      <ContactModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => { setAddOpen(false); fetchContacts(1); }}
      />
      <ContactModal
        open={!!editContact}
        contact={editContact}
        onClose={() => setEditContact(null)}
        onSaved={() => { setEditContact(null); fetchContacts(page); }}
      />
      <InteractionModal
        open={!!logFor}
        contact={logFor}
        onClose={() => setLogFor(null)}
        onSaved={() => { setLogFor(null); fetchContacts(page); }}
      />
      <CsvImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => { setImportOpen(false); fetchContacts(1); }}
      />
    </Layout>
  );
}
