import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input, Textarea } from './ui/Input';
import { api } from '../lib/api';

const EMPTY_FORM = {
  name:     '',
  industry: '',
  website:  '',
  phone:    '',
  location: '',
  notes:    '',
};

/**
 * Add / Edit company modal.
 *
 * Props:
 *   open      {boolean}
 *   onClose   {() => void}
 *   onSaved   {(company) => void}
 *   company   {object|null}  – null = add mode
 */
export default function CompanyModal({ open, onClose, onSaved, company = null }) {
  const [form, setForm]       = useState(EMPTY_FORM);
  const [errors, setErrors]   = useState({});
  const [saving, setSaving]   = useState(false);
  const [apiError, setApiError] = useState('');

  const isEdit = Boolean(company);

  /* ── seed form when modal opens ── */
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setApiError('');

    if (company) {
      setForm({
        name:     company.name     ?? '',
        industry: company.industry ?? '',
        website:  company.website  ?? '',
        phone:    company.phone    ?? '',
        location: company.location ?? '',
        notes:    company.notes    ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, company]);

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Company name is required';
    if (form.website && !/^https?:\/\//.test(form.website)) {
      errs.website = 'Website must start with http:// or https://';
    }
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    setApiError('');

    try {
      let result;
      if (isEdit) {
        result = await api.companies.update(company.id, form);
      } else {
        result = await api.companies.create(form);
      }
      onSaved(result.company ?? result);
      onClose();
    } catch (err) {
      setApiError(err.message || 'Failed to save company');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Company' : 'Add Company'}
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>
            {isEdit ? 'Save Changes' : 'Add Company'}
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

        <Input
          label="Company Name *"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          error={errors.name}
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Industry"
            value={form.industry}
            onChange={e => set('industry', e.target.value)}
            placeholder="e.g. SaaS, Finance, Retail"
          />
          <Input
            label="Location"
            value={form.location}
            onChange={e => set('location', e.target.value)}
            placeholder="City, Country"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Website"
            type="url"
            value={form.website}
            onChange={e => set('website', e.target.value)}
            error={errors.website}
            placeholder="https://example.com"
          />
          <Input
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
          />
        </div>

        <Textarea
          label="Notes"
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={3}
          placeholder="Additional context about this company…"
        />
      </form>
    </Modal>
  );
}
