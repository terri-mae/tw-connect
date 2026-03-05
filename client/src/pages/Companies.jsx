import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Search, Pencil, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';
import Header, { AddButton } from '../components/Header';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/Modal';
import CompanyModal from '../components/CompanyModal';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';

export default function Companies() {
  const navigate  = useNavigate();
  const { toast } = useToast();
  const { user }  = useAuth();

  const [companies, setCompanies] = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(1);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [addOpen, setAddOpen]     = useState(false);
  const [editCo, setEditCo]       = useState(null);
  const [deleteCo, setDeleteCo]   = useState(null);
  const [deleting, setDeleting]   = useState(false);

  const fetchCompanies = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 25 };
      if (search) params.search = search;
      const data = await api.companies.list(params);
      setCompanies(data.companies);
      setTotal(data.total);
      setPages(data.pages);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchCompanies(1); }, [search]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.companies.delete(deleteCo.id);
      toast({ title: 'Company deleted' });
      setDeleteCo(null);
      fetchCompanies(page);
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Layout>
      <Header
        title="Companies"
        actions={<AddButton label="Add Company" onClick={() => setAddOpen(true)} />}
      />

      {/* Filter bar */}
      <div className="px-6 py-3 border-b border-zinc-800 flex items-center gap-3 bg-zinc-900">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search companies…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-500 outline-none focus:border-indigo-500 w-56"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-xs text-zinc-500">Loading…</p>
          </div>
        ) : companies.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No companies found"
            description="Add your first company to get started."
            action={<button onClick={() => setAddOpen(true)} className="text-xs text-indigo-400 hover:text-indigo-300">+ Add Company</button>}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="text-left px-5 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">Company</th>
                <th className="text-left px-5 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">Industry</th>
                <th className="text-left px-5 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">Location</th>
                <th className="text-left px-5 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">Contacts</th>
                <th className="text-left px-5 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">Added</th>
                <th className="text-right px-5 py-2.5 text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map(co => (
                <tr
                  key={co.id}
                  onClick={() => navigate(`/companies/${co.id}`)}
                  className="border-b border-zinc-800/60 hover:bg-zinc-900/60 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                        <Building2 size={13} className="text-zinc-400" />
                      </div>
                      <span className="text-sm font-medium text-zinc-200">{co.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-zinc-400">{co.industry || '—'}</td>
                  <td className="px-5 py-3 text-sm text-zinc-400">{co.location || '—'}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
                      {co.contact_count}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-zinc-500">{formatDate(co.created_at)}</td>
                  <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditCo(co)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => setDeleteCo(co)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <Pagination page={page} pages={pages} total={total} limit={25} onPage={fetchCompanies} />
      </div>

      <CompanyModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={() => { setAddOpen(false); fetchCompanies(1); }} />
      <CompanyModal open={!!editCo} company={editCo} onClose={() => setEditCo(null)} onSaved={() => { setEditCo(null); fetchCompanies(page); }} />
      <ConfirmDialog
        open={!!deleteCo}
        onClose={() => setDeleteCo(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete company?"
        description={`Delete ${deleteCo?.name}? Contacts linked to this company will remain but their company will be unset.`}
        confirmLabel="Delete Company"
      />
    </Layout>
  );
}
