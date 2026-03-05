import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend,
} from 'chart.js';
import {
  Users, Building2, Activity, FileCheck,
  AlertTriangle,
} from 'lucide-react';
import Layout from '../components/Layout';
import Header, { AddButton } from '../components/Header';
import { api } from '../lib/api';
import { formatDate, daysSince, METHOD_COLORS, METHOD_LABELS, initials } from '../lib/utils';
import { EmptyState } from '../components/ui/EmptyState';
import ContactModal from '../components/ContactModal';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const CHART_DEFAULTS = {
  tooltip: { backgroundColor: '#18181b', borderColor: '#3f3f46', borderWidth: 1, padding: 10 },
};

export default function Dashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const navigate = useNavigate();

  async function load() {
    try {
      const d = await api.dashboard.summary();
      setData(d);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const stats = data?.stats || {};
  const STAT_CARDS = [
    { label: 'Total Contacts',   value: stats.total_contacts,     icon: Users,      color: 'text-indigo-400',  bg: 'bg-indigo-500/10' },
    { label: 'Companies',        value: stats.total_companies,    icon: Building2,  color: 'text-blue-400',    bg: 'bg-blue-500/10' },
    { label: 'Interactions',     value: stats.total_interactions, icon: Activity,   color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Deck Sent',        value: stats.deck_sent,          icon: FileCheck,  color: 'text-purple-400',  bg: 'bg-purple-500/10' },
  ];

  const barData = data ? {
    labels:   data.contacts_by_owner.map(r => r.owner || 'Unassigned'),
    datasets: [{
      data:            data.contacts_by_owner.map(r => r.count),
      backgroundColor: 'rgba(99,102,241,0.6)',
      hoverBackgroundColor: 'rgba(99,102,241,0.9)',
      borderRadius: 5,
    }],
  } : null;

  const doughnutData = data ? {
    labels:   ['Deck Sent', 'Not Sent'],
    datasets: [{
      data:            [data.deck_stats.sent, data.deck_stats.not_sent],
      backgroundColor: ['rgba(99,102,241,0.8)', 'rgba(63,63,70,0.7)'],
      borderWidth: 0,
    }],
  } : null;

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: CHART_DEFAULTS.tooltip },
    scales: {
      x: { grid: { color: '#27272a' }, ticks: { color: '#71717a', font: { size: 11 } } },
      y: { grid: { color: '#27272a' }, ticks: { color: '#71717a', font: { size: 11 } }, beginAtZero: true },
    },
  };

  const doughnutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '74%',
    plugins: { legend: { display: false }, tooltip: CHART_DEFAULTS.tooltip },
  };

  return (
    <Layout>
      <Header
        title="Dashboard"
        actions={<AddButton label="Add Contact" onClick={() => setAddOpen(true)} />}
      />

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          {STAT_CARDS.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-zinc-500 font-medium">{label}</p>
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon size={16} className={color} />
                </div>
              </div>
              <p className="text-2xl font-bold text-zinc-100">
                {loading ? '—' : (value ?? 0).toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Bar chart */}
          <div className="col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-sm font-semibold text-zinc-200 mb-4">Contacts by Owner</p>
            <div style={{ height: 200 }}>
              {barData ? (
                <Bar data={barData} options={chartOpts} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-xs text-zinc-500">Loading…</p>
                </div>
              )}
            </div>
          </div>

          {/* Doughnut */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col">
            <p className="text-sm font-semibold text-zinc-200 mb-4">Credentials Deck</p>
            <div className="flex-1 flex items-center justify-center" style={{ minHeight: 160 }}>
              {doughnutData ? (
                <div className="relative" style={{ width: 140, height: 140 }}>
                  <Doughnut data={doughnutData} options={doughnutOpts} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-xl font-bold text-zinc-100">
                      {data.deck_stats.sent + data.deck_stats.not_sent > 0
                        ? Math.round(data.deck_stats.sent / (data.deck_stats.sent + data.deck_stats.not_sent) * 100)
                        : 0}%
                    </p>
                    <p className="text-[0.6rem] text-zinc-500">sent</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Loading…</p>
              )}
            </div>
            {data && (
              <div className="flex justify-around mt-3 pt-3 border-t border-zinc-800">
                <div className="text-center">
                  <p className="text-sm font-semibold text-indigo-400">{data.deck_stats.sent}</p>
                  <p className="text-[0.65rem] text-zinc-500">Sent</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-zinc-400">{data.deck_stats.not_sent}</p>
                  <p className="text-[0.65rem] text-zinc-500">Not Sent</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Recent interactions */}
          <div className="col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800">
              <p className="text-sm font-semibold text-zinc-200">Recent Interactions</p>
            </div>
            {!data?.recent_interactions?.length ? (
              <EmptyState icon={Activity} title="No interactions yet" />
            ) : (
              <div>
                {data.recent_interactions.map(item => {
                  const mc = METHOD_COLORS[item.method] || METHOD_COLORS.other;
                  return (
                    <div
                      key={item.id}
                      onClick={() => navigate(`/contacts/${item.contact_id}`)}
                      className="flex items-start gap-3 px-5 py-3 border-b border-zinc-800/50 hover:bg-zinc-800/40 cursor-pointer transition-colors last:border-0"
                    >
                      <div className={`w-6 h-6 rounded-lg ${mc.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <span className={`text-[0.55rem] font-bold ${mc.text}`}>
                          {METHOD_LABELS[item.method]?.[0]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">{item.contact_name}</p>
                        <p className="text-xs text-zinc-500 truncate">{item.notes}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-zinc-400">{formatDate(item.interaction_date)}</p>
                        <p className="text-[0.65rem] text-zinc-600">{item.user_name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Needs follow-up */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-4 border-b border-zinc-800 flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400" />
              <p className="text-sm font-semibold text-zinc-200">Needs Follow-up</p>
            </div>
            {!data?.needs_follow_up?.length ? (
              <EmptyState icon={Users} title="All contacts followed up" />
            ) : (
              <div>
                {data.needs_follow_up.map(c => {
                  const days = daysSince(c.last_interaction_date);
                  return (
                    <div
                      key={c.id}
                      onClick={() => navigate(`/contacts/${c.id}`)}
                      className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/50 hover:bg-zinc-800/40 cursor-pointer transition-colors last:border-0"
                    >
                      <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                        <span className="text-[0.55rem] font-bold text-amber-400">
                          {initials(c.first_name, c.last_name)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-200 truncate">
                          {c.first_name} {c.last_name}
                        </p>
                        <p className="text-[0.65rem] text-zinc-500 truncate">{c.company_name}</p>
                      </div>
                      <span className="text-[0.65rem] text-amber-400 shrink-0">
                        {days === null ? 'Never' : `${days}d`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <ContactModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => { setAddOpen(false); load(); }}
      />
    </Layout>
  );
}
