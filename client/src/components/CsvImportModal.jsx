import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Select } from './ui/Input';
import { api } from '../lib/api';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

/* CRM fields the user can map CSV columns to */
const CRM_FIELDS = [
  { value: '',             label: '— Skip —' },
  { value: 'first_name',   label: 'First Name *' },
  { value: 'last_name',    label: 'Last Name *' },
  { value: 'email',        label: 'Email' },
  { value: 'phone',        label: 'Phone' },
  { value: 'job_title',    label: 'Job Title' },
  { value: 'company_name', label: 'Company Name' },
  { value: 'location',     label: 'Location' },
  { value: 'linkedin_url', label: 'LinkedIn URL' },
  { value: 'notes',        label: 'Notes' },
  { value: 'tags',         label: 'Tags (comma-separated)' },
  { value: 'status',       label: 'Status' },
];

/* Auto-detect obvious header names */
const HEADER_MAP = {
  'first name': 'first_name', firstname: 'first_name', 'first_name': 'first_name',
  'last name':  'last_name',  lastname:  'last_name',  'last_name':  'last_name',
  email: 'email', 'e-mail': 'email',
  phone: 'phone', telephone: 'phone', mobile: 'phone',
  'job title': 'job_title', jobtitle: 'job_title', title: 'job_title', role: 'job_title',
  company: 'company_name', 'company name': 'company_name', organisation: 'company_name', organization: 'company_name',
  location: 'location', city: 'location', country: 'location',
  linkedin: 'linkedin_url', 'linkedin url': 'linkedin_url',
  notes: 'notes', note: 'notes',
  tags: 'tags', tag: 'tags',
  status: 'status',
};

const STEPS = { UPLOAD: 'upload', MAP: 'map', RESULT: 'result' };

/**
 * CSV import modal with field-mapping step.
 *
 * Props:
 *   open    {boolean}
 *   onClose {() => void}
 *   onDone  {() => void}  – called after successful import so list can refresh
 */
export default function CsvImportModal({ open, onClose, onDone }) {
  const fileRef          = useRef(null);
  const [step, setStep]  = useState(STEPS.UPLOAD);
  const [csvHeaders, setCsvHeaders]  = useState([]);
  const [csvRows, setCsvRows]        = useState([]);
  const [mapping, setMapping]        = useState({}); // { csvHeader: crmField }
  const [importing, setImporting]    = useState(false);
  const [result, setResult]          = useState(null); // { imported, skipped, errors }
  const [fileError, setFileError]    = useState('');

  function resetAll() {
    setStep(STEPS.UPLOAD);
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping({});
    setImporting(false);
    setResult(null);
    setFileError('');
  }

  function handleClose() {
    resetAll();
    onClose();
  }

  /* ── File selected / dropped ── */
  function handleFile(file) {
    if (!file) return;
    if (!file.name.match(/\.csv$/i)) {
      setFileError('Please select a .csv file');
      return;
    }
    setFileError('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        if (!results.data?.length) {
          setFileError('The CSV file appears to be empty');
          return;
        }
        const headers = results.meta.fields ?? [];
        // Auto-detect mapping
        const auto = {};
        headers.forEach(h => {
          const key = h.toLowerCase().trim();
          if (HEADER_MAP[key]) auto[h] = HEADER_MAP[key];
        });
        setCsvHeaders(headers);
        setCsvRows(results.data);
        setMapping(auto);
        setStep(STEPS.MAP);
      },
      error(err) {
        setFileError(`Failed to parse CSV: ${err.message}`);
      },
    });
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  }

  function setFieldMapping(csvHeader, crmField) {
    setMapping(prev => ({ ...prev, [csvHeader]: crmField }));
  }

  /* Check that first_name and last_name are mapped */
  function canImport() {
    const mapped = Object.values(mapping);
    return mapped.includes('first_name') && mapped.includes('last_name');
  }

  /* ── Run the import ── */
  async function handleImport() {
    if (!canImport()) return;
    setImporting(true);

    // Transform CSV rows using the mapping
    const contacts = csvRows.map(row => {
      const contact = {};
      Object.entries(mapping).forEach(([csvHeader, crmField]) => {
        if (crmField && row[csvHeader] !== undefined) {
          const val = String(row[csvHeader]).trim();
          if (val) {
            if (crmField === 'tags') {
              contact.tags = val.split(',').map(t => t.trim()).filter(Boolean);
            } else {
              contact[crmField] = val;
            }
          }
        }
      });
      return contact;
    });

    try {
      const res = await api.contacts.import(contacts);
      setResult(res);
      setStep(STEPS.RESULT);
    } catch (err) {
      setResult({ imported: 0, skipped: 0, errors: [err.message] });
      setStep(STEPS.RESULT);
    } finally {
      setImporting(false);
    }
  }

  /* ─────────────────────────────────────────────── render ── */

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import Contacts from CSV"
      size="lg"
      footer={
        step === STEPS.UPLOAD ? (
          <div className="flex justify-end">
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          </div>
        ) : step === STEPS.MAP ? (
          <div className="flex gap-3 justify-between items-center">
            <span className="text-xs text-zinc-500">{csvRows.length} rows found</span>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={resetAll}>Back</Button>
              <Button
                variant="primary"
                onClick={handleImport}
                loading={importing}
                disabled={!canImport()}
              >
                Import {csvRows.length} Contacts
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end gap-3">
            {result?.imported > 0 && (
              <Button variant="ghost" onClick={resetAll}>Import Another File</Button>
            )}
            <Button
              variant="primary"
              onClick={() => { handleClose(); onDone?.(); }}
            >
              Done
            </Button>
          </div>
        )
      }
    >
      {/* ── Step 1: Upload ── */}
      {step === STEPS.UPLOAD && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            Upload a CSV file with your contacts. You'll be able to map columns to
            the correct fields before importing.
          </p>

          <div
            className="border-2 border-dashed border-zinc-700 rounded-xl p-10 flex flex-col items-center
                       gap-3 cursor-pointer hover:border-indigo-600/60 hover:bg-indigo-950/10
                       transition-colors group"
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-10 h-10 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-300">Drop your CSV here, or click to browse</p>
              <p className="text-xs text-zinc-500 mt-1">Only .csv files are supported</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => handleFile(e.target.files[0])}
            />
          </div>

          {fileError && (
            <p className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {fileError}
            </p>
          )}

          <div className="bg-zinc-800/50 rounded-lg p-3 space-y-1">
            <p className="text-xs font-medium text-zinc-400">Tips for best results:</p>
            <ul className="text-xs text-zinc-500 space-y-0.5 list-disc list-inside">
              <li>Include columns for first name and last name (required)</li>
              <li>Use commas to separate multiple tags in a single cell</li>
              <li>Status values: active, inactive, lead (default: active)</li>
              <li>Duplicates (same email) will be skipped automatically</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── Step 2: Map fields ── */}
      {step === STEPS.MAP && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            Match your CSV columns to the correct contact fields. Columns set to
            <strong className="text-zinc-300"> Skip</strong> will be ignored.
          </p>

          {!canImport() && (
            <p className="flex items-center gap-2 text-xs text-amber-400 bg-amber-950/30
                          border border-amber-800/40 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              First Name and Last Name must be mapped before you can import.
            </p>
          )}

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {csvHeaders.map(header => (
              <div key={header} className="grid grid-cols-2 gap-3 items-center">
                {/* CSV column preview */}
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                  <span className="text-sm text-zinc-300 truncate" title={header}>
                    {header}
                  </span>
                  {csvRows[0]?.[header] && (
                    <span className="text-xs text-zinc-600 truncate hidden sm:inline">
                      e.g. {String(csvRows[0][header]).slice(0, 20)}
                    </span>
                  )}
                </div>
                {/* CRM field selector */}
                <Select
                  value={mapping[header] ?? ''}
                  onChange={e => setFieldMapping(header, e.target.value)}
                >
                  {CRM_FIELDS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 3: Result ── */}
      {step === STEPS.RESULT && result && (
        <div className="space-y-4">
          {result.imported > 0 && (
            <div className="flex items-start gap-3 bg-emerald-950/40 border border-emerald-800/40
                            rounded-lg px-4 py-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-300">
                  {result.imported} contact{result.imported !== 1 ? 's' : ''} imported successfully
                </p>
                {result.skipped > 0 && (
                  <p className="text-xs text-emerald-500/80 mt-0.5">
                    {result.skipped} skipped (duplicate emails or missing required fields)
                  </p>
                )}
              </div>
            </div>
          )}

          {result.imported === 0 && result.skipped > 0 && (
            <div className="flex items-start gap-3 bg-amber-950/30 border border-amber-800/40
                            rounded-lg px-4 py-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-300">
                No contacts were imported. {result.skipped} rows were skipped — check for missing
                first/last names or duplicate email addresses.
              </p>
            </div>
          )}

          {result.errors?.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-red-400">Errors:</p>
              <ul className="space-y-0.5 max-h-40 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <li key={i} className="text-xs text-red-400/80 bg-red-950/30 rounded px-2 py-1">
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
