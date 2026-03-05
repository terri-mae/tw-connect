import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import { api } from '../lib/api';

const METHOD_OPTIONS = [
  { value: 'email',    label: 'Email' },
  { value: 'phone',    label: 'Phone' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'meeting',  label: 'Meeting' },
  { value: 'other',    label: 'Other' },
];

const EMPTY_FORM = {
  contact_id: '',
  method: 'email',
  summary: '',
  notes: '',
  interaction_date: '',
  credentials_deck_sent: false,
};

/**
 * Log / Edit interaction modal.
 *
 * Props:
 *   open           {boolean}
 *   onClose        {() => void}
 *   onSaved        {(interaction) => void}
 *   interaction    {object|null}  – null = add mode
 *   contactId      {number|null}  – pre-select a contact (add mode)
 *   contactName    {string}       – display name when contact is pre-selected
 */
export default function InteractionModal({
  open,
  onClose,
  onSaved,
  interaction = null,
  contactId = null,
  contactName = '',
}) {
  const [form, setForm]       = useState(EMPTY_FORM);
  const [contacts, setContacts] = useState([]);
  const [errors, setErrors]   = useState({});
  const [saving, setSaving]   = useState(false);
  const [apiError, setApiError] = useState('');

  const isEdit = Boolean(interaction);
  const isContactFixed = Boolean(contactId) && !isEdit;

  /* ── seed form when modal opens ── */
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setApiError('');

    if (interaction) {
      // Edit mode: normalise date to YYYY-MM-DD for input[type=date]
      const rawDate = interaction.interaction_date ?? '';
      const datePart = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;
      setForm({
        contact_id:             interaction.contact_id             ?? '',
        method:                 interaction.method                 ?? 'email',
        summary:                interaction.summary                ?? '',
        notes:                  interaction.notes                  ?? '',
        interaction_date:       datePart,
        credentials_deck_sent:  Boolean(interaction.credentials_deck_sent),
      });
    } else {
      // Add mode: default date to today
      const today = new Date().toISOString().split('T')[0];
      setForm({
        ...EMPTY_FORM,
        contact_id: contactId ?? '',
        interaction_date: today,
      });
    }
  }, [open, interaction, contactId]);

  /* ── load contacts for the dropdown (add mode only) ── */
  useEffect(() => {
    if (!open || isContactFixed) return;
    api.contacts.list({ limit: 200 })
      .then(d => setContacts(d.contacts ?? []))
      .catch(() => {});
  }, [open, isContactFixed]);

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!form.contact_id && !contactId) errs.contact_id = 'Contact is required';
    if (!form.summary.trim())           errs.summary     = 'Summary is required';
    if (!form.interaction_date)         errs.interaction_date = 'Date is required';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    setApiError('');

    const payload = {
      contact_id:            form.contact_id || contactId,
      method:                form.method,
      summary:               form.summary,
      notes:                 form.notes,
      interaction_date:      form.interaction_date,
      credentials_deck_sent: form.credentials_deck_sent,
    };

    try {
      let result;
      if (isEdit) {
        result = await api.interactions.update(interaction.id, payload);
      } else {
        result = await api.interactions.create(payload);
      }
      onSaved(result.interaction ?? result);
      onClose();
    } catch (err) {
      setApiError(err.message || 'Failed to save interaction');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Interaction' : 'Log Interaction'}
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>
            {isEdit ? 'Save Changes' : 'Log Interaction'}
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

        {/* Contact – fixed pill or dropdown */}
        {isContactFixed ? (
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Contact</label>
            <div className="h-9 flex items-center px-3 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-sm text-zinc-200">
              {contactName}
            </div>
          </div>
        ) : (
          <Select
            label="Contact *"
            value={form.contact_id}
            onChange={e => set('contact_id', e.target.value)}
            error={errors.contact_id}
          >
            <option value="">— Select contact —</option>
            {contacts.map(c => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
                {c.company_name ? ` · ${c.company_name}` : ''}
              </option>
            ))}
          </Select>
        )}

        {/* Method + Date */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Method"
            value={form.method}
            onChange={e => set('method', e.target.value)}
          >
            {METHOD_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          <Input
            label="Date *"
            type="date"
            value={form.interaction_date}
            onChange={e => set('interaction_date', e.target.value)}
            error={errors.interaction_date}
          />
        </div>

        {/* Summary */}
        <Input
          label="Summary *"
          value={form.summary}
          onChange={e => set('summary', e.target.value)}
          error={errors.summary}
          placeholder="Brief description of the interaction…"
          autoFocus={!isContactFixed}
        />

        {/* Notes */}
        <Textarea
          label="Notes"
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={3}
          placeholder="Additional context, next steps, etc."
        />

        {/* Credentials deck sent */}
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={form.credentials_deck_sent}
              onChange={e => set('credentials_deck_sent', e.target.checked)}
            />
            <div className="w-9 h-5 bg-zinc-700 rounded-full peer-checked:bg-indigo-600
                            transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/50" />
            <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform
                            peer-checked:translate-x-4" />
          </div>
          <span className="text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors">
            Credentials deck was sent during this interaction
          </span>
        </label>
      </form>
    </Modal>
  );
}
