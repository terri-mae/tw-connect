import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import { api } from '../lib/api';

const STATUS_OPTIONS = [
  { value: 'active',   label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'lead',     label: 'Lead' },
];

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  company_id: '',
  job_title: '',
  linkedin_url: '',
  location: '',
  status: 'active',
  notes: '',
  tags: '',
};

/**
 * Add / Edit contact modal.
 *
 * Props:
 *   open       {boolean}
 *   onClose    {() => void}
 *   onSaved    {(contact) => void}
 *   contact    {object|null}  – null = add mode
 */
export default function ContactModal({ open, onClose, onSaved, contact = null }) {
  const [form, setForm]       = useState(EMPTY_FORM);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers]     = useState([]);
  const [errors, setErrors]   = useState({});
  const [saving, setSaving]   = useState(false);
  const [apiError, setApiError] = useState('');

  const isEdit = Boolean(contact);

  /* ── seed form when modal opens ── */
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setApiError('');

    if (contact) {
      setForm({
        first_name:   contact.first_name   ?? '',
        last_name:    contact.last_name    ?? '',
        email:        contact.email        ?? '',
        phone:        contact.phone        ?? '',
        company_id:   contact.company_id   ?? '',
        job_title:    contact.job_title    ?? '',
        linkedin_url: contact.linkedin_url ?? '',
        location:     contact.location     ?? '',
        status:       contact.status       ?? 'active',
        notes:        contact.notes        ?? '',
        tags:         Array.isArray(contact.tags) ? contact.tags.join(', ') : '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, contact]);

  /* ── load companies + users once ── */
  useEffect(() => {
    if (!open) return;
    api.companies.all().then(d => setCompanies(d.companies ?? [])).catch(() => {});
    api.users.list().then(d => setUsers(d.users ?? [])).catch(() => {});
  }, [open]);

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = 'First name is required';
    if (!form.last_name.trim())  errs.last_name  = 'Last name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Invalid email address';
    }
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    setApiError('');

    const payload = {
      ...form,
      company_id: form.company_id || null,
      tags: form.tags
        ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
        : [],
    };

    try {
      let result;
      if (isEdit) {
        result = await api.contacts.update(contact.id, payload);
      } else {
        result = await api.contacts.create(payload);
      }
      onSaved(result.contact ?? result);
      onClose();
    } catch (err) {
      setApiError(err.message || 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Contact' : 'Add Contact'}
      size="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>
            {isEdit ? 'Save Changes' : 'Add Contact'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {apiError && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2">
            {apiError}
          </p>
        )}

        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First Name *"
            value={form.first_name}
            onChange={e => set('first_name', e.target.value)}
            error={errors.first_name}
            autoFocus
          />
          <Input
            label="Last Name *"
            value={form.last_name}
            onChange={e => set('last_name', e.target.value)}
            error={errors.last_name}
          />
        </div>

        {/* Email + Phone */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            error={errors.email}
          />
          <Input
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
          />
        </div>

        {/* Company + Job title */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Company"
            value={form.company_id}
            onChange={e => set('company_id', e.target.value)}
          >
            <option value="">— None —</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Input
            label="Job Title"
            value={form.job_title}
            onChange={e => set('job_title', e.target.value)}
          />
        </div>

        {/* Status + Owner */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Status"
            value={form.status}
            onChange={e => set('status', e.target.value)}
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          <Select
            label="Owner"
            value={form.owner_id ?? ''}
            onChange={e => set('owner_id', e.target.value)}
          >
            <option value="">— Unassigned —</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.first_name} {u.last_name}
              </option>
            ))}
          </Select>
        </div>

        {/* LinkedIn + Location */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="LinkedIn URL"
            value={form.linkedin_url}
            onChange={e => set('linkedin_url', e.target.value)}
            placeholder="https://linkedin.com/in/..."
          />
          <Input
            label="Location"
            value={form.location}
            onChange={e => set('location', e.target.value)}
            placeholder="City, Country"
          />
        </div>

        {/* Tags */}
        <Input
          label="Tags (comma-separated)"
          value={form.tags}
          onChange={e => set('tags', e.target.value)}
          placeholder="e.g. warm-lead, conference-2025, vc"
        />

        {/* Notes */}
        <Textarea
          label="Notes"
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={3}
          placeholder="Background info, context, reminders…"
        />
      </form>
    </Modal>
  );
}
