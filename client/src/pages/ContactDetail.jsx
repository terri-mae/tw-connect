import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, Mail, Phone, MapPin, Linkedin,
  Building2, User, Calendar, FileCheck, Tag,
  Pencil, Trash2, Plus,
} from 'lucide-react';
import Layout from '../components/Layout';
import Header from '../components/Header';
import { ConfirmDialog } from '../components/ui/Modal';
import ContactModal from '../components/ContactModal';
import InteractionModal from '../components/InteractionModal';
import { api } from '../lib/api';
import { formatDate, initials, STATUS_CONFIG, METHOD_COLORS, METHOD_LABELS } from '../lib/utils';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';

export default function ContactDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { toast } = useToast();
  const { user }  = useAuth();

  const [contact, setContact]         = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading]         = useState(true);

  const [editOpen, setEditOpen]           = useState(false);
  const [logOpen, setLogOpen]             = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletingContact, setDeletingContact] = useState(false);
  const [deleteInteraction, setDeleteInteraction] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.contacts.get(id);
      setContact(data.contact);
      setInteractions(data.interactions);
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      navigate('/contacts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleDeleteContact() {
    setDeletingContact(true);
    try {
      await api.contacts.delete(id);
      toast({ title: 'Contact deleted' });
      navigate('/contacts');
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setDeletingContact(false);
    }
  }

  async function handleDeleteInteraction() {
    try {
      await api.interactions.delete(deleteInteraction.id);
      toast({ title: 'Interaction deleted' });
      setDeleteInteraction(null);
      load();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }

  if (loading || !contact) {
    return (
      <Layout>
        <Header title="Contact" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-zinc-500">Loading…</p>
        </div>
      </Layout>
    );
  }

  const sc = STATUS_CONFIG[contact.status] || STATUS_CONFIG.active;
  const canEdit = user?.role === 'admin' || contact.owner_id === user?.id;

  return (
    <Layout>
      <Header title="Contact Detail" />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-5">
          <Link to="/contacts" className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
            <ChevronLeft size={12} /> Contacts
          </Link>
          <span>/</span>
          <span className="text-zinc-300">{contact.first_name} {contact.last_name}</span>
        </div>

        {/* Contact header */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-indigo-400">
                {initials(contact.first_name, contact.last_name)}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-100">
                {contact.first_name} {contact.last_name}
              </h2>
              {contact.job_title && (
                <p className="text-sm text-zinc-400 mt-0.5">{contact.job_title}</p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sc.className}`}>
                  {sc.label}
                </span>
                {contact.credentials_deck_sent ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/15 text-indigo-400">
                    <FileCheck size={11} /> Deck sent {formatDate(contact.credentials_deck_sent_date)}
                  </span>
                ) : null}
                {contact.tags?.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-400 border border-zinc-700">
                    <Tag size={10} /> {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLogOpen(true)}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus size={12} /> Log Interaction
              </button>
              <button
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                <Pencil size={12} /> Edit
              </button>
              <button
                onClick={() => setDeleteConfirm(true)}
                className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: '300px 1fr' }}>
          {/* Left: contact info */}
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <p className="text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider mb-4">Contact Info</p>
              <div className="space-y-3">
                {contact.email && (
                  <InfoRow icon={Mail}>
                    <a href={`mailto:${contact.email}`} className="text-sm text-indigo-400 hover:underline break-all">
                      {contact.email}
                    </a>
                  </InfoRow>
                )}
                {contact.phone && (
                  <InfoRow icon={Phone}>
                    <a href={`tel:${contact.phone}`} className="text-sm text-zinc-300 hover:text-zinc-100">
                      {contact.phone}
                    </a>
                  </InfoRow>
                )}
                {contact.company_name && (
                  <InfoRow icon={Building2}>
                    <Link to={`/companies/${contact.company_id}`} className="text-sm text-zinc-300 hover:text-indigo-400 transition-colors">
                      {contact.company_name}
                    </Link>
                  </InfoRow>
                )}
                {contact.location && (
                  <InfoRow icon={MapPin}>
                    <span className="text-sm text-zinc-300">{contact.location}</span>
                  </InfoRow>
                )}
                {contact.linkedin_url && (
                  <InfoRow icon={Linkedin}>
                    <a href={contact.linkedin_url.startsWith('http') ? contact.linkedin_url : `https://${contact.linkedin_url}`}
                      target="_blank" rel="noreferrer" className="text-sm text-zinc-300 hover:text-indigo-400 truncate transition-colors">
                      LinkedIn Profile
                    </a>
                  </InfoRow>
                )}
                {contact.owner_name && (
                  <InfoRow icon={User}>
                    <span className="text-sm text-zinc-300">{contact.owner_name}</span>
                  </InfoRow>
                )}
                <InfoRow icon={Calendar}>
                  <span className="text-sm text-zinc-400">Added {formatDate(contact.created_at)}</span>
                </InfoRow>
              </div>
            </div>

            {contact.notes && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <p className="text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Notes</p>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{contact.notes}</p>
              </div>
            )}
          </div>

          {/* Right: interaction timeline */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-200">Interaction Timeline</p>
              <span className="text-xs text-zinc-500">{interactions.length} interaction{interactions.length !== 1 ? 's' : ''}</span>
            </div>

            {interactions.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <p className="text-xs text-zinc-500 mb-3">No interactions logged yet.</p>
                {canEdit && (
                  <button
                    onClick={() => setLogOpen(true)}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    + Log first interaction
                  </button>
                )}
              </div>
            ) : (
              <div className="px-5 py-4 space-y-4">
                {interactions.map((item, i) => {
                  const mc = METHOD_COLORS[item.method] || METHOD_COLORS.other;
                  return (
                    <div key={item.id} className="relative flex gap-4">
                      {/* Timeline line */}
                      {i < interactions.length - 1 && (
                        <div className="absolute left-4 top-8 bottom-0 w-px bg-zinc-800" />
                      )}
                      {/* Method icon */}
                      <div className={`w-8 h-8 rounded-lg ${mc.bg} border flex items-center justify-center shrink-0 z-10`}
                        style={{ borderColor: mc.icon + '40' }}>
                        <span className={`text-[0.6rem] font-bold ${mc.text}`}>
                          {METHOD_LABELS[item.method]?.[0]}
                        </span>
                      </div>
                      {/* Content */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <span className={`text-xs font-semibold ${mc.text}`}>
                              {METHOD_LABELS[item.method]}
                            </span>
                            {item.credentials_deck_sent ? (
                              <span className="ml-2 text-[0.65rem] bg-indigo-500/15 text-indigo-400 px-1.5 py-0.5 rounded-full">
                                Deck sent
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs text-zinc-500">{formatDate(item.interaction_date)}</span>
                            {(user?.role === 'admin' || item.logged_by_id === user?.id) && (
                              <button
                                onClick={() => setDeleteInteraction(item)}
                                className="p-1 text-zinc-600 hover:text-red-400 transition-colors rounded"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{item.notes}</p>
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

      <ContactModal
        open={editOpen}
        contact={contact}
        onClose={() => setEditOpen(false)}
        onSaved={() => { setEditOpen(false); load(); }}
      />
      <InteractionModal
        open={logOpen}
        contact={contact}
        onClose={() => setLogOpen(false)}
        onSaved={() => { setLogOpen(false); load(); }}
      />
      <ConfirmDialog
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDeleteContact}
        loading={deletingContact}
        title="Delete contact?"
        description={`This will permanently delete ${contact.first_name} ${contact.last_name} and all their interactions. This cannot be undone.`}
        confirmLabel="Delete Contact"
      />
      <ConfirmDialog
        open={!!deleteInteraction}
        onClose={() => setDeleteInteraction(null)}
        onConfirm={handleDeleteInteraction}
        title="Delete interaction?"
        description="This interaction will be permanently removed."
        confirmLabel="Delete"
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
