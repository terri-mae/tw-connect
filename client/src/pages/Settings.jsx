import React, { useEffect, useState } from 'react';
import {
  Users, Activity, ShieldCheck, UserX, UserCheck,
  RotateCcw, Pencil, Plus, Download,
} from 'lucide-react';
import Layout from '../components/Layout';
import Header from '../components/Header';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { api } from '../lib/api';
import { formatDate, formatDateTime } from '../lib/utils';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';

const SUB_NAV = [
  { key: 'team',     icon: Users,    label: 'Team Members' },
  { key: 'activity', icon: Activity, label: 'Activity Log' },
];

export default function Settings() {
  const { user }  = useAuth();
  const { toast } = useToast();
  const [tab, setTab]     = useState('team');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (user?.role === 'admin') {
      api.users.list().then(d => setUsers(d.users)).catch(() => {});
    }
  }, [user]);

  return (
    <Layout>
      <Header title="Settings" />

      <div className="flex flex-1 overflow-hidden">
        {/* Sub-nav */}
        <div className="w-48 border-r border-zinc-800 bg-zinc-900 flex flex-col p-3 gap-0.5">
          {SUB_NAV.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                tab === key
                  ? 'bg-indigo-500/15 text-indigo-400'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
          <div className="border-t border-zinc-800 mt-3 pt-3">
            <button
              onClick={() => {
                const data = api.contacts.list({ limit: 10000 });
                toast({ title: 'Export started', description: 'Your data will download shortly.' });
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors w-full text-left"
            >
              <Download size={15} />
              Data Export
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'team' && (
            <TeamTab users={users} setUsers={setUsers} currentUser={user} toast={toast} />
          )}
          {tab === 'activity' && <ActivityTab />}
        </div>
      </div>
    </Layout>
  );
}

// ── Team Tab ─────────────────────────────────────────────────────────────────
function TeamTab({ users, setUsers, currentUser, toast }) {
  const [addOpen, setAddOpen]           = useState(false);
  const [editUser, setEditUser]         = useState(null);
  const [resetUser, setResetUser]       = useState(null);
  const [deactivate, setDeactivate]     = useState(null);
  const [reactivate, setReactivate]     = useState(null);
  const [processing, setProcessing]     = useState(false);

  async function refreshUsers() {
    const data = await api.users.list();
    setUsers(data.users);
  }

  async function handleDeactivate() {
    setProcessing(true);
    try {
      await api.users.update(deactivate.id, { status: 'inactive' });
      toast({ title: `${deactivate.first_name} deactivated` });
      setDeactivate(null);
      refreshUsers();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setProcessing(false); }
  }

  async function handleReactivate() {
    setProcessing(true);
    try {
      await api.users.update(reactivate.id, { status: 'active' });
      toast({ title: `${reactivate.first_name} reactivated` });
      setReactivate(null);
      refreshUsers();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setProcessing(false); }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Team Members</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Admin access only</p>
        </div>
        {currentUser?.role === 'admin' && (
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus size={13} /> Add Team Member
          </button>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-5 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">Member</th>
              <th className="text-left px-5 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">Email</th>
              <th className="text-left px-5 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">Role</th>
              <th className="text-left px-5 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">Joined</th>
              <th className="text-right px-5 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const isMe = u.id === currentUser?.id;
              return (
                <tr
                  key={u.id}
                  className={`border-b border-zinc-800/60 last:border-0 transition-colors ${
                    isMe ? 'bg-indigo-500/5' : ''
                  } ${u.status === 'inactive' ? 'opacity-60' : ''}`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                        <span className="text-[0.55rem] font-bold text-indigo-400">
                          {u.first_name?.[0]}{u.last_name?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">
                          {u.first_name} {u.last_name}{isMe ? ' (you)' : ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-zinc-400">{u.email}</td>
                  <td className="px-5 py-3">
                    {u.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/15 text-indigo-400">
                        <ShieldCheck size={10} /> Admin
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400">
                        Member
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.status === 'active'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-red-500/15 text-red-400'
                    }`}>
                      {u.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-zinc-500">{formatDate(u.created_at)}</td>
                  <td className="px-5 py-3 text-right">
                    {!isMe && currentUser?.role === 'admin' && (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Edit"
                          onClick={() => setEditUser(u)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          title="Reset password"
                          onClick={() => setResetUser(u)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <RotateCcw size={13} />
                        </button>
                        {u.status === 'active' ? (
                          <button
                            title="Deactivate"
                            onClick={() => setDeactivate(u)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <UserX size={13} />
                          </button>
                        ) : (
                          <button
                            title="Reactivate"
                            onClick={() => setReactivate(u)}
                            className="px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                          >
                            <UserCheck size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-600 mt-3">
        Deactivated accounts cannot log in. Their contacts and interactions are preserved.
      </p>

      <AddUserModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => { setAddOpen(false); refreshUsers(); }}
        toast={toast}
      />
      <EditUserModal
        open={!!editUser}
        user={editUser}
        onClose={() => setEditUser(null)}
        onSaved={() => { setEditUser(null); refreshUsers(); }}
        toast={toast}
      />
      <ResetPasswordModal
        open={!!resetUser}
        user={resetUser}
        onClose={() => setResetUser(null)}
        toast={toast}
      />
      <ConfirmDialog
        open={!!deactivate}
        onClose={() => setDeactivate(null)}
        onConfirm={handleDeactivate}
        loading={processing}
        title={`Deactivate ${deactivate?.first_name}?`}
        description="They will no longer be able to log in. Their data is preserved."
        confirmLabel="Deactivate"
      />
      <ConfirmDialog
        open={!!reactivate}
        onClose={() => setReactivate(null)}
        onConfirm={handleReactivate}
        loading={processing}
        title={`Reactivate ${reactivate?.first_name}?`}
        description="They will be able to log in again."
        confirmLabel="Reactivate"
        variant="primary"
      />
    </div>
  );
}

// ── Activity Tab ──────────────────────────────────────────────────────────────
function ActivityTab() {
  const [log, setLog]     = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage]   = useState(1);
  const [loading, setLoading] = useState(true);

  async function load(p = 1) {
    setLoading(true);
    try {
      const data = await api.users.activityLog(p);
      setLog(data.activity);
      setTotal(data.total);
      setPage(p);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6">
      <h2 className="text-sm font-semibold text-zinc-200 mb-4">Activity Log</h2>
      {loading ? (
        <p className="text-xs text-zinc-500">Loading…</p>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-5 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">When</th>
                <th className="text-left px-5 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">User</th>
                <th className="text-left px-5 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">Action</th>
                <th className="text-left px-5 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">Entity</th>
              </tr>
            </thead>
            <tbody>
              {log.map(entry => (
                <tr key={entry.id} className="border-b border-zinc-800/60 last:border-0">
                  <td className="px-5 py-2.5 text-xs text-zinc-500 whitespace-nowrap">{formatDateTime(entry.created_at)}</td>
                  <td className="px-5 py-2.5 text-xs text-zinc-300">{entry.user_name || 'System'}</td>
                  <td className="px-5 py-2.5 text-xs text-zinc-400 font-mono">{entry.action}</td>
                  <td className="px-5 py-2.5 text-xs text-zinc-500">
                    {entry.entity_type && `${entry.entity_type} #${entry.entity_id}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Add User Modal ────────────────────────────────────────────────────────────
function AddUserModal({ open, onClose, onSaved, toast }) {
  const [form, setForm]   = useState({ first_name: '', last_name: '', email: '', password: '', role: 'member' });
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.users.create(form);
      toast({ title: 'Team member added' });
      onSaved();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  }

  const inputClass = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500';

  return (
    <Modal open={open} onClose={onClose} title="Add Team Member" width={480}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-zinc-400 bg-zinc-800 border border-zinc-700 rounded-lg hover:border-zinc-600">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50">
            {saving ? 'Adding…' : 'Add Member'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="First name *">
            <input className={inputClass} value={form.first_name} onChange={e => setForm(f => ({...f, first_name: e.target.value}))} required />
          </FieldGroup>
          <FieldGroup label="Last name *">
            <input className={inputClass} value={form.last_name} onChange={e => setForm(f => ({...f, last_name: e.target.value}))} required />
          </FieldGroup>
        </div>
        <FieldGroup label="Email *">
          <input type="email" className={inputClass} value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required />
        </FieldGroup>
        <FieldGroup label="Password * (min 10 chars)">
          <input type="password" className={inputClass} value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} minLength={10} required />
        </FieldGroup>
        <FieldGroup label="Role">
          <select className={inputClass} value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </FieldGroup>
      </form>
    </Modal>
  );
}

function EditUserModal({ open, user, onClose, onSaved, toast }) {
  const [form, setForm]   = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setForm({ first_name: user.first_name, last_name: user.last_name, email: user.email, role: user.role });
  }, [user]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.users.update(user.id, form);
      toast({ title: 'User updated' });
      onSaved();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  }

  const inputClass = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500';
  return (
    <Modal open={open} onClose={onClose} title={`Edit ${user?.first_name}`} width={480}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-zinc-400 bg-zinc-800 border border-zinc-700 rounded-lg hover:border-zinc-600">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="First name">
            <input className={inputClass} value={form.first_name || ''} onChange={e => setForm(f => ({...f, first_name: e.target.value}))} />
          </FieldGroup>
          <FieldGroup label="Last name">
            <input className={inputClass} value={form.last_name || ''} onChange={e => setForm(f => ({...f, last_name: e.target.value}))} />
          </FieldGroup>
        </div>
        <FieldGroup label="Email">
          <input type="email" className={inputClass} value={form.email || ''} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
        </FieldGroup>
        <FieldGroup label="Role">
          <select className={inputClass} value={form.role || 'member'} onChange={e => setForm(f => ({...f, role: e.target.value}))}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </FieldGroup>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ open, user, onClose, toast }) {
  const [password, setPassword] = useState('');
  const [saving, setSaving]     = useState(false);

  async function handleReset(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.users.resetPassword(user.id, { password });
      toast({ title: 'Password reset' });
      setPassword('');
      onClose();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Reset password for ${user?.first_name}`} width={400}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-zinc-400 bg-zinc-800 border border-zinc-700 rounded-lg hover:border-zinc-600">Cancel</button>
          <button onClick={handleReset} disabled={saving} className="px-4 py-1.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50">
            {saving ? 'Resetting…' : 'Reset Password'}
          </button>
        </>
      }
    >
      <form onSubmit={handleReset}>
        <FieldGroup label="New password (min 10 chars)">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            minLength={10}
            required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500"
          />
        </FieldGroup>
      </form>
    </Modal>
  );
}

function FieldGroup({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}
