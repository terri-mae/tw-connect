import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, Globe, Phone, MapPin, Building2, Users, Calendar, Pencil,
} from 'lucide-react';
import Layout from '../components/Layout';
import Header from '../components/Header';
import CompanyModal from '../components/CompanyModal';
import { api } from '../lib/api';
import { formatDate, initials, METHOD_COLORS, METHOD_LABELS, STATUS_CONFIG } from '../lib/utils';
import { useToast } from '../hooks/useToast';

export default function CompanyDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { toast } = useToast();

  const [company, setCompany]           = useState(null);
  const [contacts, setContacts]         = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [editOpen, setEditOpen]         = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.companies.get(id);
      setCompany(data.company);
      setContacts(data.contacts);
      setInteractions(data.interactions);
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      navigate('/companies');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  if (loading || !company) {
    return (
      <Layout>
        <Header title="Company" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-zinc-500">Loading…</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header title="Company Detail" />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-5">
          <Link to="/companies" className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
            <ChevronLeft size={12} /> Companies
          </Link>
          <span>/</span>
          <span className="text-zinc-300">{company.name}</span>
        </div>

        {/* Company header */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
              <Building2 size={24} className="text-zinc-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-100">{company.name}</h2>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {company.industry && (
                  <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full">
                    {company.industry}
                  </span>
                )}
                {company.location && (
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <MapPin size={11} /> {company.location}
                  </span>
                )}
                {company.website && (
                  <a
                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                    target="_blank" rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:underline"
                  >
                    <Globe size={11} /> {company.website}
                  </a>
                )}
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <Users size={11} /> {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <Calendar size={11} /> Added {formatDate(company.created_at)}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Pencil size={12} /> Edit
          </button>
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: '300px 1fr' }}>
          {/* Left */}
          <div className="space-y-4">
            {/* Info */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <p className="text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider mb-4">Company Info</p>
              <div className="space-y-3">
                {company.phone && (
                  <InfoRow icon={Phone}>
                    <a href={`tel:${company.phone}`} className="text-sm text-zinc-300">{company.phone}</a>
                  </InfoRow>
                )}
                {company.website && (
                  <InfoRow icon={Globe}>
                    <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank" rel="noreferrer" className="text-sm text-indigo-400 hover:underline break-all">
                      {company.website}
                    </a>
                  </InfoRow>
                )}
                {company.location && (
                  <InfoRow icon={MapPin}>
                    <span className="text-sm text-zinc-300">{company.location}</span>
                  </InfoRow>
                )}
              </div>
            </div>

            {/* Notes */}
            {company.notes && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <p className="text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Notes</p>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{company.notes}</p>
              </div>
            )}

            {/* Contacts */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <p className="text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">Contacts</p>
                <span className="text-xs text-zinc-500">{contacts.length}</span>
              </div>
              {contacts.length === 0 ? (
                <p className="text-xs text-zinc-500 p-4">No contacts</p>
              ) : (
                <div>
                  {contacts.slice(0, 5).map(c => {
                    const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.active;
                    return (
                      <Link
                        key={c.id}
                        to={`/contacts/${c.id}`}
                        className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/60 hover:bg-zinc-800/40 transition-colors last:border-0"
                      >
                        <div className="w-6 h-6 rounded-full bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0">
                          <span className="text-[0.5rem] font-bold text-indigo-400">
                            {initials(c.first_name, c.last_name)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-zinc-200 truncate">
                            {c.first_name} {c.last_name}
                          </p>
                          <p className="text-[0.65rem] text-zinc-500 truncate">{c.job_title}</p>
                        </div>
                        <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-full ${sc.className}`}>
                          {sc.label}
                        </span>
                      </Link>
                    );
                  })}
                  {contacts.length > 5 && (
                    <p className="text-xs text-indigo-400 px-4 py-2.5">View all {contacts.length} contacts</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: company interaction timeline */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-200">All Interactions</p>
              <span className="text-xs text-zinc-500">{interactions.length} total</span>
            </div>
            {interactions.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-xs text-zinc-500">No interactions logged for contacts at this company yet.</p>
              </div>
            ) : (
              <div className="px-5 py-4 space-y-4">
                {interactions.map((item, i) => {
                  const mc = METHOD_COLORS[item.method] || METHOD_COLORS.other;
                  return (
                    <div key={item.id} className="relative flex gap-4">
                      {i < interactions.length - 1 && (
                        <div className="absolute left-4 top-8 bottom-0 w-px bg-zinc-800" />
                      )}
                      <div className={`w-8 h-8 rounded-lg ${mc.bg} border flex items-center justify-center shrink-0 z-10`}
                        style={{ borderColor: mc.icon + '40' }}>
                        <span className={`text-[0.6rem] font-bold ${mc.text}`}>
                          {METHOD_LABELS[item.method]?.[0]}
                        </span>
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${mc.text}`}>
                              {METHOD_LABELS[item.method]}
                            </span>
                            <Link
                              to={`/contacts/${item.contact_id}`}
                              onClick={e => e.stopPropagation()}
                              className={`text-[0.65rem] px-1.5 py-0.5 rounded-full ${mc.bg} ${mc.text} hover:opacity-80`}
                            >
                              {item.contact_name}
                            </Link>
                          </div>
                          <span className="text-xs text-zinc-500">{formatDate(item.interaction_date)}</span>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed">{item.notes}</p>
                        <p className="text-[0.65rem] text-zinc-600 mt-1">Logged by {item.user_name || 'unknown'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <CompanyModal
        open={editOpen}
        company={company}
        onClose={() => setEditOpen(false)}
        onSaved={() => { setEditOpen(false); load(); }}
      />
    </Layout>
  );
}

function InfoRow({ icon: Icon, children }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={13} className="text-zinc-500 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
