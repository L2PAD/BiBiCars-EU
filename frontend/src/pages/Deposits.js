/**
 * Deposits — global CRM page (Doopr #7 / Enhancement #7)
 * =======================================================
 *
 * Spec columns (table):
 *   1.  Клієнт (link → /admin/customers/:id/360)
 *   2.  Номер телефону   (tel: link)
 *   3.  Відповідальний менеджер
 *   4.  Дата депозиту
 *   5.  Сума
 *   6.  Валюта
 *   7.  Статус        — Підтверджено / Очікує оплати / Повернення / + Скасовано
 *   8.  Договір       (link or short ID)
 *   9.  Файли         (count badge — popover on hover)
 *  10.  Коментар       (truncated)
 *  11.  UTM-мітки      (compact `source / medium · campaign`, tooltip = all 5)
 *  12.  Джерело ліда  (badge + optional link to original lead)
 *  13.  Дії           (edit / delete)
 *
 * Data source: GET /api/deposits with enrichment (reads BOTH db.legal_deposits
 * AND legacy db.deposits, unified shape).  RBAC is enforced on the backend;
 * the page does not need to gate on role itself.
 *
 * i18n keys live under the `dep7_*` namespace (UK / EN / BG).
 * All interactive elements include a `data-testid` attribute.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../App';
import { useLang, getLocale } from '../i18n';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import DatePresetFilter from '../components/filters/DatePresetFilter';
import ManagerFilter from '../components/filters/ManagerFilter';
import {
  Banknote,
  Phone as PhoneIcon,
  FileText,
  Paperclip,
  Pencil,
  Trash2,
  ExternalLink,
  Globe,
  RefreshCw,
  Filter,
  CheckCircle2,
} from 'lucide-react';

// ── Status taxonomy ────────────────────────────────────────────────────────
// Backend may return any of: pending / paid / cancelled / refunded / held / approved
const STATUS_FILTER_OPTIONS = ['', 'pending', 'paid', 'refunded', 'cancelled'];

const statusBadge = (status, t) => {
  const s = String(status || '').toLowerCase();
  const map = {
    pending:   { cls: 'bg-amber-50 text-amber-700 border-amber-200',     label: t('dep7_status_pending') },
    paid:      { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: t('dep7_status_paid') },
    refunded:  { cls: 'bg-blue-50 text-blue-700 border-blue-200',         label: t('dep7_status_refunded') },
    cancelled: { cls: 'bg-zinc-100 text-zinc-600 border-zinc-200',        label: t('dep7_status_cancelled') },
    held:      { cls: 'bg-violet-50 text-violet-700 border-violet-200',   label: t('dep7_status_held') },
    approved:  { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: t('dep7_status_approved') },
  };
  return map[s] || { cls: 'bg-zinc-100 text-zinc-700 border-zinc-200', label: status || '—' };
};

// Compact UTM cell. Renders `source / medium · campaign` with a tooltip
// that exposes all five UTM keys.
const UtmCell = ({ utm, t }) => {
  if (!utm || typeof utm !== 'object') {
    return <span className="text-zinc-400 text-[11px]">{t('dep7_utm_none')}</span>;
  }
  const { utm_source = '', utm_medium = '', utm_campaign = '', utm_content = '', utm_term = '' } = utm;
  const anyFilled = utm_source || utm_medium || utm_campaign || utm_content || utm_term;
  if (!anyFilled) return <span className="text-zinc-400 text-[11px]">{t('dep7_utm_none')}</span>;
  const tooltip = [
    `source: ${utm_source || '—'}`,
    `medium: ${utm_medium || '—'}`,
    `campaign: ${utm_campaign || '—'}`,
    `content: ${utm_content || '—'}`,
    `term: ${utm_term || '—'}`,
  ].join('\n');
  const compact = [
    utm_source,
    utm_medium ? `/ ${utm_medium}` : '',
    utm_campaign ? `· ${utm_campaign}` : '',
  ].filter(Boolean).join(' ');
  return (
    <span
      title={tooltip}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-mono bg-violet-50 text-violet-700 border border-violet-200 max-w-[180px] truncate"
      data-testid="utm-cell"
    >
      <Globe className="w-3 h-3 shrink-0" /> <span className="truncate">{compact || utm_source}</span>
    </span>
  );
};

const LeadSourceCell = ({ leadSource, leadId, t }) => {
  if (!leadSource) return <span className="text-zinc-400">{t('dep7_lead_source_none')}</span>;
  const Wrapper = leadId ? 'a' : 'span';
  const props = leadId
    ? { href: `/admin/leads/${leadId}`, className: 'underline-offset-2 hover:underline' }
    : {};
  return (
    <Wrapper
      {...props}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200 ${props.className || ''}`}
      data-testid="lead-source-cell"
    >
      {leadSource}
      {leadId ? <ExternalLink className="w-3 h-3" /> : null}
    </Wrapper>
  );
};

const FilesCell = ({ files }) => {
  const count = Array.isArray(files) ? files.length : 0;
  if (!count) return <span className="text-zinc-400 text-[11px]">—</span>;
  const title = files.map(f => f.name).join('\n');
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-50 text-zinc-700 border border-zinc-200"
      data-testid="files-cell"
    >
      <Paperclip className="w-3 h-3" /> {count}
    </span>
  );
};

const Deposits = () => {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [managerId, setManagerId] = useState('');
  const [dateRange, setDateRange] = useState({ preset: 'all', dateFrom: '', dateTo: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (managerId) params.append('managerId', managerId);
      if (dateRange.dateFrom) params.append('dateFrom', dateRange.dateFrom);
      if (dateRange.dateTo)   params.append('dateTo',   dateRange.dateTo);
      params.append('limit', '500');
      const res = await axios.get(`${API_URL}/api/deposits?${params}`);
      const data = res.data || {};
      setItems(Array.isArray(data.items) ? data.items : (data.data || []));
      setSummary(data.summary || null);
    } catch (err) {
      toast.error(t('error') || 'Failed to load deposits');
      setItems([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, managerId, dateRange.dateFrom, dateRange.dateTo, t]);

  useEffect(() => { load(); }, [load]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(d => {
      const blob = [
        d.customerName, d.customerPhone, d.managerName,
        d.contractNumber, d.comment, d.leadSource,
        d.utm?.utm_source, d.utm?.utm_campaign,
      ].filter(Boolean).join(' ').toLowerCase();
      return blob.includes(q);
    });
  }, [items, search]);

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      data-testid="deposits-page"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[#18181B] text-white flex items-center justify-center shrink-0">
            <Banknote size={20} />
          </div>
          <div className="min-w-0">
            <h1
              className="text-xl sm:text-2xl font-bold tracking-tight text-[#18181B] leading-tight"
              style={{ fontFamily: 'Mazzard, Mazzard H, Mazzard M, system-ui, sans-serif' }}
              data-testid="deposits-title"
            >
              {t('dep7_page_title')}
            </h1>
            <p className="text-xs sm:text-sm text-[#71717A] mt-1">{t('dep7_page_subtitle')}</p>
          </div>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E4E4E7] bg-white hover:bg-zinc-50 text-sm font-medium text-zinc-700"
          data-testid="deposits-refresh-btn"
        >
          <RefreshCw className="w-4 h-4" /> {t('refresh') || 'Refresh'}
        </button>
      </div>

      {/* Summary KPI strip */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <KpiCard label={t('dep7_summary_total')} value={summary.total ?? 0} testId="kpi-total" />
          <KpiCard label={t('dep7_summary_paid')}  value={summary.paid ?? 0}  testId="kpi-paid" colour="emerald" />
          <KpiCard label={t('dep7_summary_pending')} value={summary.pending ?? 0} testId="kpi-pending" colour="amber" />
          <KpiCard label={t('dep7_summary_refunded')} value={summary.refunded ?? 0} testId="kpi-refunded" colour="sky" />
        </div>
      )}

      {/* Filters */}
      <div className="card p-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-zinc-500 text-xs uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" /> {t('dep7_filter_status')}
        </div>
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTER_OPTIONS.map(s => {
            const label = s
              ? statusBadge(s, t).label
              : t('dep7_filter_all');
            const active = statusFilter === s;
            return (
              <button
                key={s || 'all'}
                onClick={() => setStatusFilter(s)}
                className={`px-3 h-8 rounded-lg text-[12.5px] font-medium border transition-colors ${
                  active ? 'bg-[#18181B] text-white border-[#18181B]' : 'bg-white text-zinc-700 border-[#E4E4E7] hover:bg-zinc-50'
                }`}
                data-testid={`deposits-filter-${s || 'all'}`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <ManagerFilter value={managerId} onChange={setManagerId} t={t} testId="deposits-manager-filter" />
          <DatePresetFilter value={dateRange} onChange={setDateRange} t={t} testId="deposits-date-filter" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search') || 'Search…'}
            className="input h-9 w-[180px] sm:w-[240px]"
            data-testid="deposits-search-input"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-premium w-full min-w-[1280px]" data-testid="deposits-table">
            <thead className="bg-zinc-50 text-zinc-600 text-[11px] uppercase">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold">{t('dep7_col_client')}</th>
                <th className="text-left px-3 py-2.5 font-semibold">{t('dep7_col_phone')}</th>
                <th className="text-left px-3 py-2.5 font-semibold">{t('dep7_col_manager')}</th>
                <th className="text-left px-3 py-2.5 font-semibold">{t('dep7_col_date')}</th>
                <th className="text-right px-3 py-2.5 font-semibold">{t('dep7_col_amount')}</th>
                <th className="text-left px-3 py-2.5 font-semibold">{t('dep7_col_currency')}</th>
                <th className="text-left px-3 py-2.5 font-semibold">{t('dep7_col_status')}</th>
                <th className="text-left px-3 py-2.5 font-semibold">{t('dep7_col_contract')}</th>
                <th className="text-left px-3 py-2.5 font-semibold">{t('dep7_col_files')}</th>
                <th className="text-left px-3 py-2.5 font-semibold">{t('dep7_col_comment')}</th>
                <th className="text-left px-3 py-2.5 font-semibold">{t('dep7_col_utm')}</th>
                <th className="text-left px-3 py-2.5 font-semibold">{t('dep7_col_lead_source')}</th>
                <th className="text-right px-3 py-2.5 font-semibold">{t('dep7_col_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading && (
                <tr>
                  <td colSpan={13} className="text-center py-10 text-zinc-400">
                    {t('dep7_loading')}
                  </td>
                </tr>
              )}
              {!loading && filteredItems.length === 0 && (
                <tr>
                  <td colSpan={13} className="text-center py-10 text-zinc-400">
                    {t('dep7_no_data')}
                  </td>
                </tr>
              )}
              {!loading && filteredItems.map(d => {
                const sb = statusBadge(d.status, t);
                const locale = getLocale();
                const dateStr = d.date ? new Date(d.date).toLocaleDateString(locale) : '—';
                return (
                  <tr key={d.id} className="hover:bg-zinc-50" data-testid={`deposit-row-${d.id}`}>
                    <td className="px-3 py-2.5">
                      {d.customerId ? (
                        <a
                          href={`/admin/customers/${d.customerId}/360`}
                          className="text-zinc-900 font-medium hover:text-[#4F46E5]"
                          data-testid={`deposit-customer-${d.id}`}
                        >
                          {d.customerName || d.customerId.slice(-8)}
                        </a>
                      ) : <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[12px]">
                      {d.customerPhone ? (
                        <a
                          href={`tel:${String(d.customerPhone).replace(/\s+/g,'')}`}
                          className="text-zinc-700 hover:text-[#4F46E5] inline-flex items-center gap-1"
                          data-testid={`deposit-phone-${d.id}`}
                        >
                          <PhoneIcon className="w-3 h-3" /> {d.customerPhone}
                        </a>
                      ) : <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-700 whitespace-nowrap">
                      {d.managerName || <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-700 whitespace-nowrap font-mono text-[12px]">
                      {dateStr}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-emerald-700">
                      {Number(d.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-600">{d.currency || 'EUR'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${sb.cls}`} data-testid={`deposit-status-${d.id}`}>
                        {sb.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-700">
                      {d.contractId ? (
                        <a
                          href={`/admin/legal?tab=contracts&id=${d.contractId}`}
                          className="inline-flex items-center gap-1 text-[12px] hover:text-[#4F46E5]"
                          title={t('dep7_open_contract')}
                          data-testid={`deposit-contract-${d.id}`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {d.contractNumber || d.contractId.slice(-8)}
                        </a>
                      ) : <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5"><FilesCell files={d.files} /></td>
                    <td className="px-3 py-2.5 max-w-[220px]">
                      <span
                        className="block truncate text-[12px] text-zinc-600"
                        title={d.comment || ''}
                      >
                        {d.comment || <span className="text-zinc-400">—</span>}
                      </span>
                    </td>
                    <td className="px-3 py-2.5"><UtmCell utm={d.utm} t={t} /></td>
                    <td className="px-3 py-2.5">
                      <LeadSourceCell leadSource={d.leadSource} leadId={d.leadId} t={t} />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        {d.status === 'pending' && (
                          <button
                            onClick={async () => {
                              try {
                                await axios.patch(`${API_URL}/api/deposits/${d.id}`, { status: 'paid' });
                                toast.success(t('dep7_status_paid'));
                                load();
                              } catch {
                                toast.error(t('error') || 'Failed');
                              }
                            }}
                            title={t('dep7_status_paid')}
                            className="h-8 w-8 rounded-lg border border-emerald-100 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 inline-flex items-center justify-center"
                            data-testid={`deposit-approve-${d.id}`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <a
                          href={`/admin/customers/${d.customerId}/360?tab=deposits&dep=${d.id}`}
                          title={t('edit') || 'Edit'}
                          className="h-8 w-8 rounded-lg border border-[#E4E4E7] bg-white hover:bg-zinc-50 text-zinc-600 inline-flex items-center justify-center"
                          data-testid={`deposit-edit-${d.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </a>
                        {d.status !== 'cancelled' && (
                          <button
                            onClick={async () => {
                              if (!window.confirm(t('confirmDelete') || 'Delete?')) return;
                              try {
                                await axios.delete(`${API_URL}/api/deposits/${d.id}`);
                                toast.success(t('dep7_status_cancelled'));
                                load();
                              } catch {
                                toast.error(t('error') || 'Failed');
                              }
                            }}
                            title={t('delete') || 'Delete'}
                            className="h-8 w-8 rounded-lg border border-rose-100 bg-rose-50 hover:bg-rose-100 text-rose-700 inline-flex items-center justify-center"
                            data-testid={`deposit-delete-${d.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
    </motion.div>
  );
};

const KpiCard = ({ label, value, colour = 'zinc', testId }) => {
  const colourMap = {
    zinc:    'bg-zinc-50 text-zinc-700 border-zinc-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
    sky:     'bg-sky-50 text-sky-700 border-sky-200',
  };
  return (
    <div className={`card p-3 border ${colourMap[colour]}`} data-testid={testId}>
      <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-xl font-bold mt-0.5">{value}</div>
    </div>
  );
};

export default Deposits;
