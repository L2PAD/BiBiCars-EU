/**
 * Sales — list / create / edit page for sold vehicles.
 *
 * Phase Final / Block 2 (Sales Entity, variant C).
 *
 * Supports 3 source modes via the Create modal:
 *   - Manual:    free input (VIN/Lot/Auction/Brand/Model/Year)
 *   - From VIN:  user enters VIN, page auto-fills via existing /api/bulk/vehicle/{vin}
 *   - From Deal: user picks an existing deal (catalog item), page enriches
 *
 * Visibility filter pillar (USA / Korea / Other) is in the top toolbar.
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Banknote, Plus, RefreshCw, Search, Filter, Car, FileText, X, Save,
  CheckCircle2, XCircle, Globe, ClipboardCheck,
} from 'lucide-react';
import { useLang } from '../i18n';
import DatePresetFilter from '../components/filters/DatePresetFilter';
import ManagerFilter from '../components/filters/ManagerFilter';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const COUNTRY_OPTIONS = [
  { value: '',       label: 'All countries', color: '#71717A' },
  { value: 'USA',    label: 'USA',           color: '#2563EB' },
  { value: 'KOREA',  label: 'Korea',         color: '#D97706' },
  { value: 'OTHER',  label: 'Other',         color: '#71717A' },
];

const STATUS_OPTIONS = [
  { value: '',          label: 'All statuses' },
  { value: 'draft',     label: 'Draft' },
  { value: 'active',    label: 'Active' },
  { value: 'sold',      label: 'Sold' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_BADGE = {
  draft:     { bg: 'bg-zinc-100',    text: 'text-zinc-700',    label: 'Draft' },
  active:    { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'Active' },
  sold:      { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Sold' },
  cancelled: { bg: 'bg-rose-100',    text: 'text-rose-700',    label: 'Cancelled' },
};

const CURRENCIES = ['USD', 'EUR', 'BGN', 'UAH', 'GBP'];
const AUCTIONS   = ['copart', 'iaai', 'manheim', 'korea_auction', 'mobile_de', 'autoscout24', 'other'];

const emptySale = (defaults = {}) => ({
  id: null,
  customerId: '',
  managerId: '',
  source: 'manual',
  vin: '',
  lot: '',
  auction: '',
  country: 'OTHER',
  brand: '',
  model: '',
  year: '',
  saleAmount: 0,
  saleCurrency: 'USD',
  dealId: '',
  contractId: '',
  status: 'draft',
  notes: '',
  ...defaults,
});

export default function Sales() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState(null);
  const [managerId, setManagerId] = useState('');
  const [dateRange, setDateRange] = useState({ preset: 'all', dateFrom: '', dateTo: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (country) params.country = country;
      if (status)  params.status  = status;
      if (managerId) params.managerId = managerId;
      if (dateRange.dateFrom) params.dateFrom = dateRange.dateFrom;
      if (dateRange.dateTo)   params.dateTo   = dateRange.dateTo;
      const [salesR, custR] = await Promise.all([
        axios.get(`${API_URL}/api/sales`, { params }),
        axios.get(`${API_URL}/api/customers`).catch(() => ({ data: { items: [] } })),
      ]);
      setItems(salesR.data?.items || []);
      const cs = custR.data?.items || custR.data?.customers || [];
      setCustomers(Array.isArray(cs) ? cs : []);
    } catch (e) {
      toast.error('Failed to load sales');
    } finally {
      setLoading(false);
    }
  }, [country, status, managerId, dateRange.dateFrom, dateRange.dateTo]);

  useEffect(() => { load(); }, [load]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((s) =>
      [s.vin, s.lot, s.brand, s.model, s.notes, s.customerId]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [items, search]);

  const saveSale = async () => {
    if (!editor.customerId) { toast.error('Customer is required'); return; }
    if (!editor.vin && !editor.lot && !editor.dealId) {
      toast.error('At least one of VIN, Lot or Deal is required'); return;
    }
    try {
      if (editor.id) {
        await axios.patch(`${API_URL}/api/sales/${editor.id}`, editor);
        toast.success('Sale updated');
      } else {
        await axios.post(`${API_URL}/api/sales`, editor);
        toast.success('Sale created');
      }
      setEditor(null);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save');
    }
  };

  const markSold = async (s) => {
    try {
      await axios.patch(`${API_URL}/api/sales/${s.id}`, { status: 'sold' });
      toast.success('Marked as sold');
      await load();
    } catch (e) { toast.error('Failed to update'); }
  };

  const cancelSale = async (s) => {
    if (!window.confirm(`Cancel sale ${s.vin || s.lot || s.id}?`)) return;
    try {
      await axios.delete(`${API_URL}/api/sales/${s.id}`);
      toast.success('Sale cancelled');
      await load();
    } catch (e) { toast.error('Failed to cancel'); }
  };

  /* Доопр #23 + 2026-06 — Generate Handover Act (Приёмо-предавателен протокол) */
  const [handoverModal, setHandoverModal] = useState(null);   // { sale } | null
  const [handoverForm, setHandoverForm] = useState({
    handover_place: 'гр. София',
    handover_date:  new Date().toISOString().slice(0, 10),
    handover_time:  '',
    documents:      '',
    condition:      '',
    keys_and_accessories: '',
    comments:       '',
  });
  const [handoverSubmitting, setHandoverSubmitting] = useState(false);

  const openHandover = (s) => {
    if (!s.customerId) {
      toast.error(tt('saleHandoverNoCustomer', 'Sale has no customer attached'));
      return;
    }
    setHandoverForm((f) => ({
      ...f,
      handover_date: new Date().toISOString().slice(0, 10),
      // sensible defaults derived from the sale
      documents:     '',
      condition:     '',
      keys_and_accessories: '',
      comments:      '',
    }));
    setHandoverModal({ sale: s });
  };

  const generateHandoverAct = async () => {
    const s = handoverModal?.sale;
    if (!s) return;
    setHandoverSubmitting(true);
    try {
      const r = await axios.post(
        `${API_URL}/api/sales/${s.id}/handover-act`,
        { ...handoverForm, language: 'bg' },
      );
      const d = r.data?.data || {};
      toast.success(`${tt('saleHandoverGenerated', 'Handover Act generated')} v${d.version || 1}`);
      // Download with auth header (window.open won't carry it)
      if (d.file_id) {
        try {
          const headers = axios.defaults.headers.common || {};
          const res = await fetch(`${API_URL}/api/file-manager/files/${d.file_id}/download`, { headers });
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a   = document.createElement('a');
          a.href = url;
          a.download = `Priemo_predavatelen_protokol_${s.id}_v${d.version || 1}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        } catch { /* silent */ }
      }
      setHandoverModal(null);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to generate act');
    } finally {
      setHandoverSubmitting(false);
    }
  };

  const tt = (key, fallback) => {
    if (!t) return fallback;
    const v = t(key);
    return (!v || v === key) ? fallback : v;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-[#18181B] text-white flex items-center justify-center shrink-0">
          <Banknote className="w-[18px] h-[18px]" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[17px] sm:text-[19px] font-semibold tracking-tight text-[#18181B] leading-tight">
            Sales
          </h1>
          <p className="mt-1 text-[12.5px] sm:text-[13px] text-[#71717A] leading-relaxed">
            Sold vehicles — across all sources (manual, deals, VIN lookup).
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setEditor(emptySale())}
            data-testid="new-sale-btn"
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] active:bg-black text-white text-[12.5px] font-semibold focus:outline-none focus-visible:ring-4 focus-visible:ring-black/15 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Sale
          </button>
          <button
            onClick={load}
            aria-label="Refresh"
            className="h-9 w-9 rounded-xl border border-[#E4E4E7] bg-white hover:bg-zinc-50 inline-flex items-center justify-center text-zinc-600"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-zinc-400" />
          {COUNTRY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setCountry(opt.value)}
              className={`h-9 px-3 rounded-xl text-[12.5px] font-medium border transition-colors ${
                country === opt.value
                  ? 'bg-[#18181B] text-white border-[#18181B]'
                  : 'bg-white text-zinc-700 border-[#E4E4E7] hover:bg-zinc-50'
              }`}
              data-testid={`country-filter-${opt.value || 'all'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <ManagerFilter value={managerId} onChange={setManagerId} t={t} testId="sales-manager-filter" />
          <DatePresetFilter value={dateRange} onChange={setDateRange} t={t} testId="sales-date-filter" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 px-2 rounded-xl border border-[#E4E4E7] bg-white text-[12.5px] focus:outline-none focus:ring-2 focus:ring-black/10"
            data-testid="sales-status-filter"
          >
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="VIN, lot, brand, model…"
              className="h-9 pl-8 pr-3 rounded-xl border border-[#E4E4E7] bg-white text-[12.5px] w-[260px] focus:outline-none focus:ring-2 focus:ring-black/10"
              data-testid="sales-search-input"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="bg-zinc-50 text-zinc-600 text-[12px] uppercase">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">{t('sales_client') || 'Client'}</th>
                <th className="text-left px-4 py-3 font-semibold">{t('sales_phone') || 'Phone'}</th>
                <th className="text-left px-4 py-3 font-semibold">{t('sales_manager') || 'Manager'}</th>
                <th className="text-left px-4 py-3 font-semibold">{t('sal7_col_sale_date')}</th>
                <th className="text-left px-4 py-3 font-semibold">Vehicle</th>
                <th className="text-left px-4 py-3 font-semibold">VIN</th>
                <th className="text-left px-4 py-3 font-semibold">{t('sal7_col_lot')}</th>
                <th className="text-left px-4 py-3 font-semibold">Country</th>
                <th className="text-left px-4 py-3 font-semibold">Auction</th>
                <th className="text-left px-4 py-3 font-semibold">Amount</th>
                <th className="text-left px-4 py-3 font-semibold">{t('sales_contract') || 'Contract'}</th>
                <th className="text-left px-4 py-3 font-semibold">{t('sal7_col_docs')}</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">{t('sal7_col_utm')}</th>
                <th className="text-left px-4 py-3 font-semibold">{t('sal7_col_lead_source')}</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading && filteredItems.length === 0 && (
                <tr><td colSpan={16} className="text-center py-10 text-zinc-400">Loading…</td></tr>
              )}
              {!loading && filteredItems.length === 0 && (
                <tr><td colSpan={16} className="text-center py-10 text-zinc-400">{t('sal7_no_data')}</td></tr>
              )}
              {filteredItems.map((s) => {
                const badge = STATUS_BADGE[s.status] || STATUS_BADGE.draft;
                return (
                  <tr key={s.id} className="hover:bg-zinc-50" data-testid={`sale-row-${s.id}`}>
                    <td className="px-4 py-3">
                      {s.customerId ? (
                        <a href={`/admin/customers/${s.customerId}/360`} className="text-zinc-900 font-medium hover:text-[#4F46E5]" data-testid={`sale-customer-${s.id}`}>
                          {s.customerName || s.customerId.slice(-8)}
                        </a>
                      ) : <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-[12px]">
                      {s.customerPhone ? (
                        <a href={`tel:${String(s.customerPhone).replace(/\s+/g,'')}`}
                           className="text-zinc-700 hover:text-[#4F46E5]"
                           data-testid={`sale-phone-${s.id}`}>
                          {s.customerPhone}
                        </a>
                      ) : <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 whitespace-nowrap">
                      {s.managerName || (s.managerId ? s.managerId.slice(-6) : '—')}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 whitespace-nowrap font-mono text-[12px]">
                      {s.saleDate ? new Date(s.saleDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-zinc-400" />
                        <div>
                          <div className="font-semibold text-zinc-900">{[s.brand, s.model].filter(Boolean).join(' ') || '—'}</div>
                          <div className="text-[11px] text-zinc-500">{s.year || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px]">{s.vin || '—'}</td>
                    <td className="px-4 py-3 font-mono text-[12px]">{s.lot || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium">
                        {s.country || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{s.auction || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-zinc-900">
                      {Number(s.saleAmount || 0).toLocaleString()} {s.saleCurrency}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {s.contractId ? (
                        <a
                          href={`/admin/legal?tab=contracts&id=${s.contractId}`}
                          className="inline-flex items-center gap-1 text-[12px] hover:text-[#4F46E5]"
                          data-testid={`sale-contract-${s.id}`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {s.contractNumber || s.contractId.slice(-8)}
                        </a>
                      ) : <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {Array.isArray(s.files) && s.files.length ? (
                        <span
                          title={s.files.map(f => f.name).join('\n')}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-50 text-zinc-700 border border-zinc-200"
                          data-testid={`sale-files-${s.id}`}
                        >
                          {s.files.length} {t('sal7_docs_count')}
                        </span>
                      ) : <span className="text-zinc-400 text-[11px]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.utm && (s.utm.utm_source || s.utm.utm_medium || s.utm.utm_campaign) ? (
                        <span
                          title={`source: ${s.utm.utm_source || '—'}\nmedium: ${s.utm.utm_medium || '—'}\ncampaign: ${s.utm.utm_campaign || '—'}\ncontent: ${s.utm.utm_content || '—'}\nterm: ${s.utm.utm_term || '—'}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-mono bg-violet-50 text-violet-700 border border-violet-200 max-w-[180px] truncate"
                          data-testid={`sale-utm-${s.id}`}
                        >
                          <Globe className="w-3 h-3 shrink-0" />
                          <span className="truncate">
                            {[s.utm.utm_source, s.utm.utm_medium ? `/ ${s.utm.utm_medium}` : '', s.utm.utm_campaign ? `· ${s.utm.utm_campaign}` : ''].filter(Boolean).join(' ')}
                          </span>
                        </span>
                      ) : <span className="text-zinc-400 text-[11px]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {s.leadSource ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200"
                          data-testid={`sale-lead-source-${s.id}`}
                        >
                          {s.leadSource}
                        </span>
                      ) : <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {s.status !== 'sold' && s.status !== 'cancelled' && (
                          <button
                            onClick={() => markSold(s)}
                            title="Mark as sold"
                            className="h-8 w-8 rounded-lg border border-emerald-100 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 inline-flex items-center justify-center"
                            data-testid={`sale-mark-sold-${s.id}`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setEditor({ ...s })}
                          title="Edit"
                          className="h-8 w-8 rounded-lg border border-[#E4E4E7] bg-white hover:bg-zinc-50 text-zinc-600 inline-flex items-center justify-center"
                          data-testid={`sale-edit-${s.id}`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        {/* Доопр #23 — Generate Handover Act */}
                        <button
                          onClick={() => openHandover(s)}
                          title={tt('saleHandoverAct', 'Свали Приёмо-предавателен протокол')}
                          className="h-8 w-8 rounded-lg border border-amber-100 bg-amber-50 hover:bg-amber-100 text-amber-700 inline-flex items-center justify-center"
                          data-testid={`sale-handover-${s.id}`}
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                        </button>
                        {s.status !== 'cancelled' && (
                          <button
                            onClick={() => cancelSale(s)}
                            title="Cancel"
                            className="h-8 w-8 rounded-lg border border-rose-100 bg-rose-50 hover:bg-rose-100 text-rose-700 inline-flex items-center justify-center"
                            data-testid={`sale-cancel-${s.id}`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Modal */}
      {editor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" data-testid="sale-editor-modal">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-zinc-900">
                {editor.id ? 'Edit Sale' : 'New Sale'}
              </h2>
              <button
                onClick={() => setEditor(null)}
                className="h-8 w-8 rounded-lg hover:bg-zinc-100 inline-flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Source */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Source</label>
                <div className="flex gap-2 flex-wrap">
                  {['manual', 'vin', 'deal'].map((src) => (
                    <button
                      key={src}
                      onClick={() => setEditor({ ...editor, source: src })}
                      className={`px-3 h-9 rounded-xl border text-[12.5px] font-medium transition-colors ${
                        editor.source === src
                          ? 'bg-[#18181B] text-white border-[#18181B]'
                          : 'bg-white text-zinc-700 border-[#E4E4E7] hover:bg-zinc-50'
                      }`}
                      data-testid={`sale-source-${src}`}
                    >
                      {src === 'manual' ? 'Manual entry' : src === 'vin' ? 'From VIN' : 'From Deal'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Customer*</label>
                <select
                  value={editor.customerId}
                  onChange={(e) => setEditor({ ...editor, customerId: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  data-testid="sale-editor-customer"
                >
                  <option value="">— Select customer —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName || ''} {c.lastName || ''} {c.email ? `(${c.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Source-specific: Deal */}
              {editor.source === 'deal' && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Deal ID</label>
                  <input
                    value={editor.dealId}
                    onChange={(e) => setEditor({ ...editor, dealId: e.target.value })}
                    placeholder="deal_..."
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                    data-testid="sale-editor-dealid"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">When set, the server enriches VIN/Lot/Brand/Model/Year from the deal.</p>
                </div>
              )}

              {/* Vehicle identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">VIN</label>
                  <input
                    value={editor.vin || ''}
                    onChange={(e) => setEditor({ ...editor, vin: e.target.value.toUpperCase() })}
                    placeholder="JN8AZ2NC1H9507061"
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black/10"
                    data-testid="sale-editor-vin"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Lot</label>
                  <input
                    value={editor.lot || ''}
                    onChange={(e) => setEditor({ ...editor, lot: e.target.value })}
                    placeholder="64892341"
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black/10"
                    data-testid="sale-editor-lot"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Country</label>
                  <select
                    value={editor.country}
                    onChange={(e) => setEditor({ ...editor, country: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                    data-testid="sale-editor-country"
                  >
                    <option value="USA">USA</option>
                    <option value="KOREA">Korea</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Auction</label>
                  <select
                    value={editor.auction || ''}
                    onChange={(e) => setEditor({ ...editor, auction: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                    data-testid="sale-editor-auction"
                  >
                    <option value="">—</option>
                    {AUCTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Year</label>
                  <input
                    type="number"
                    value={editor.year || ''}
                    onChange={(e) => setEditor({ ...editor, year: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                    data-testid="sale-editor-year"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Brand</label>
                  <input
                    value={editor.brand || ''}
                    onChange={(e) => setEditor({ ...editor, brand: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                    data-testid="sale-editor-brand"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Model</label>
                  <input
                    value={editor.model || ''}
                    onChange={(e) => setEditor({ ...editor, model: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                    data-testid="sale-editor-model"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Sale Amount</label>
                  <input
                    type="number"
                    value={editor.saleAmount}
                    onChange={(e) => setEditor({ ...editor, saleAmount: parseFloat(e.target.value || 0) })}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                    data-testid="sale-editor-amount"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Currency</label>
                  <select
                    value={editor.saleCurrency}
                    onChange={(e) => setEditor({ ...editor, saleCurrency: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                    data-testid="sale-editor-currency"
                  >
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Status</label>
                <select
                  value={editor.status}
                  onChange={(e) => setEditor({ ...editor, status: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  data-testid="sale-editor-status"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="sold">Sold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Notes</label>
                <textarea
                  value={editor.notes || ''}
                  onChange={(e) => setEditor({ ...editor, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  data-testid="sale-editor-notes"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-zinc-200 px-6 py-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditor(null)}
                className="h-10 px-4 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-sm font-medium text-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={saveSale}
                className="h-10 px-5 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-sm font-semibold text-white inline-flex items-center gap-2"
                data-testid="sale-editor-save"
              >
                <Save className="w-4 h-4" /> {editor.id ? 'Save changes' : 'Create sale'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handover Act (Приёмо-предавателен протокол) modal */}
      {handoverModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto" data-testid="handover-modal">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full my-8">
            <div className="px-5 py-4 border-b border-[#E4E4E7] flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h3 className="text-base font-bold text-[#18181B]">{tt('handoverActTitle', 'Приёмо-предавателен протокол')}</h3>
                <p className="text-[11px] text-[#71717A] mt-0.5">
                  {tt('handoverActSubtitle', 'Приложение №2 към Договор за поръчка')} ·
                  {handoverModal.sale?.brand} {handoverModal.sale?.model} {handoverModal.sale?.year ? `· ${handoverModal.sale.year}` : ''}
                </p>
              </div>
              <button onClick={() => setHandoverModal(null)} className="text-[#71717A] hover:text-[#18181B]" data-testid="handover-close">✕</button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-[#71717A] mb-1">{tt('handoverPlace', 'Място на предаване')}</label>
                  <input type="text" value={handoverForm.handover_place}
                    onChange={(e) => setHandoverForm({ ...handoverForm, handover_place: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-[#E4E4E7] bg-white text-[13px]"
                    data-testid="handover-place" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-[#71717A] mb-1">{tt('handoverDate', 'Дата')}</label>
                  <input type="date" value={handoverForm.handover_date}
                    onChange={(e) => setHandoverForm({ ...handoverForm, handover_date: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-[#E4E4E7] bg-white text-[13px]"
                    data-testid="handover-date" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-[#71717A] mb-1">{tt('handoverTime', 'Час')}</label>
                  <input type="time" value={handoverForm.handover_time}
                    onChange={(e) => setHandoverForm({ ...handoverForm, handover_time: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-[#E4E4E7] bg-white text-[13px]"
                    data-testid="handover-time" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-[#71717A] mb-1">{tt('handoverDocuments', 'Предадени документи')}</label>
                <textarea value={handoverForm.documents}
                  onChange={(e) => setHandoverForm({ ...handoverForm, documents: e.target.value })}
                  placeholder={tt('handoverDocumentsPh', 'напр. Договор за покупка, талон, ключове, COC, митническа декларация')}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E4E7] bg-white text-[13px]"
                  data-testid="handover-documents" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-[#71717A] mb-1">{tt('handoverCondition', 'Състояние при предаване')}</label>
                <textarea value={handoverForm.condition}
                  onChange={(e) => setHandoverForm({ ...handoverForm, condition: e.target.value })}
                  placeholder={tt('handoverConditionPh', 'Без видими повреди / описание на установени забележки')}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E4E7] bg-white text-[13px]"
                  data-testid="handover-condition" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-[#71717A] mb-1">{tt('handoverKeys', 'Ключове / аксесоари')}</label>
                <input type="text" value={handoverForm.keys_and_accessories}
                  onChange={(e) => setHandoverForm({ ...handoverForm, keys_and_accessories: e.target.value })}
                  placeholder={tt('handoverKeysPh', '2 ключа, ръководство, гумени постелки')}
                  className="w-full h-9 px-3 rounded-lg border border-[#E4E4E7] bg-white text-[13px]"
                  data-testid="handover-keys" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-[#71717A] mb-1">{tt('handoverRemarks', 'Забележки на ВЪЗЛОЖИТЕЛЯ')}</label>
                <textarea value={handoverForm.comments}
                  onChange={(e) => setHandoverForm({ ...handoverForm, comments: e.target.value })}
                  placeholder={tt('handoverRemarksPh', 'Допълнителни забележки (по избор)')}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E4E7] bg-white text-[13px]"
                  data-testid="handover-remarks" />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-[#E4E4E7] flex items-center justify-end gap-2 sticky bottom-0 bg-white rounded-b-2xl">
              <button
                onClick={() => setHandoverModal(null)}
                className="px-3 h-9 rounded-lg border border-[#E4E4E7] text-sm text-[#52525B] hover:bg-[#FAFAFA]"
                data-testid="handover-cancel"
              >
                {tt('cancel', 'Отказ')}
              </button>
              <button
                onClick={generateHandoverAct}
                disabled={handoverSubmitting}
                className="px-4 h-9 rounded-lg bg-[#FEAE00] hover:bg-[#F59E0B] text-[#18181B] text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
                data-testid="handover-submit"
              >
                <ClipboardCheck className="w-4 h-4" />
                {handoverSubmitting ? tt('saving', 'Запазване…') : tt('handoverDownload', 'Свали PDF')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
