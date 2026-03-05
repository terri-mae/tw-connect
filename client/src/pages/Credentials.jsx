import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck, Clock } from 'lucide-react';
import Layout from '../components/Layout';
import Header from '../components/Header';
import { api } from '../lib/api';
import { formatDate, initials, STATUS_CONFIG } from '../lib/utils';

export default function Credentials() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('not_sent');
  const navigate = useNavigate();

  useEffect(() => {
    api.dashboard.credentials()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const list = data?.[tab] || [];

  return (
    <Layout>
      <Header title="Credentials Deck" />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 mb-6" style={{ maxWidth: 480 }}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileCheck size={15} className="text-indigo-400" />
              <p className="text-xs font-medium text-zinc-400">Deck Sent</p>
            </div>
            <p className="text-2xl font-bold text-zinc-100">{data?.sent?.length ?? '—'}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={15} className="text-amber-400" />
              <p className="text-xs font-medium text-zinc-400">Not Sent</p>
            </div>
            <p className="text-2xl font-bold text-zinc-100">{data?.not_sent?.length ?? '—'}</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-zinc-800 mb-5">
          {[
            { key: 'not_sent', label: 'Not Yet Sent' },
            { key: 'sent',     label: 'Sent' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {label}
              <span className="ml-2 text-xs bg-zinc-800 px-1.5 py-0.5 rounded-full">
                {data?.[key]?.length ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-xs text-zinc-500">Loading…</p>
        ) : list.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-zinc-500">
              {tab === 'sent' ? 'No credentials decks sent yet.' : 'All contacts have received the credentials deck!'}
            </p>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-5 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">Contact</th>
                  <th className="text-left px-5 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">Company</th>
                  <th className="text-left px-5 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">Owner</th>
                  <th className="text-left px-5 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                  {tab === 'sent' && (
                    <th className="text-left px-5 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">Date Sent</th>
                  )}
                  {tab === 'not_sent' && (
                    <th className="text-left px-5 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">Last Interaction</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {list.map(c => {
                  const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.active;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/contacts/${c.id}`)}
                      className="border-b border-zinc-800/60 hover:bg-zinc-800/40 cursor-pointer transition-colors last:border-0"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
                            <span className="text-[0.5rem] font-bold text-indigo-400">
                              {initials(c.first_name, c.last_name)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-200">{c.first_name} {c.last_name}</p>
                            {c.job_title && <p className="text-[0.65rem] text-zinc-500">{c.job_title}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-zinc-400">{c.company_name || '—'}</td>
                      <td className="px-5 py-3 text-sm text-zinc-400">{c.owner_name || '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sc.className}`}>
                          {sc.label}
                        </span>
                      </td>
                      {tab === 'sent' ? (
                        <td className="px-5 py-3">
                          <span className="text-xs text-indigo-400 flex items-center gap-1">
                            <FileCheck size={11} /> {formatDate(c.credentials_deck_sent_date)}
                          </span>
                        </td>
                      ) : (
                        <td className="px-5 py-3 text-xs text-zinc-500">
                          {c.last_interaction_date ? formatDate(c.last_interaction_date) : 'Never'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </Layout>
  );
}
