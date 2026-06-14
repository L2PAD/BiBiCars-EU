/**
 * BIBI Cars — Wave 15 — Contract360
 *
 * Contract Lifecycle Management center. Fills the contractual vacuum
 * between Deal360 and Finance360.
 *
 * Tabs:
 *   • Overview    — headline KPIs + segment + status + at-risk preview
 *   • Contracts   — filterable list with health badge + drilldown
 *   • Templates   — 4 default templates with "Create from template"
 *   • Approvals   — pending approval queue (per step)
 *   • Risk        — at-risk contracts (unsigned / expired / missing annex / wrong version)
 *   • Timeline    — drilldown view for a single contract
 *
 * Every contract row drills into Deal360 (when deal_id exists) and into a
 * detail panel showing approvals + timeline + attachments.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  FileText, ArrowsClockwise, Plus, CurrencyEur, Warning, ArrowSquareOut,
  CheckCircle, XCircle, Clock, PaperPlaneTilt, Archive, PencilSimple,
  ListBullets, Stack, ShieldCheck, Files, ChartLine, Lifebuoy,
} from '@phosphor-icons/react';

import { API_URL } from '../App';
import { useLang } from '../i18n';
import { HelpTooltip } from '../components/ui/HelpTooltip';
import { Select } from '../components/ui/Select';
import WhiteSelect from '../components/ui/WhiteSelect';
import RefreshButton from '../components/ui/RefreshButton';
import { PageHeader, PageTabs, HeaderActionButton } from '../components/ui/PageHeader';
import RoleZoneBadge from '../components/ui/RoleZoneBadge';

const fmt = (n, ccy = 'EUR') => {
  const num = Number(n || 0);
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: ccy, maximumFractionDigits: 0 }).format(num); }
  catch { return `${ccy} ${num.toFixed(0)}`; }
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return iso; }
};

// Translate a stable backend-emitted reason code into the active locale.
//
// Backend emits strings of the form ``"reason.expires_in_days:7"`` —
// the part before ``":"`` is the i18n key, the comma-separated tail are
// positional ``{0}, {1}, …`` parameters. If no translation exists we just
// pretty-print the raw payload so legacy data still reads sanely.
const localizeReason = (raw, t) => {
  if (raw == null) return '';
  const str = String(raw);
  // Codes always start with "reason." — anything else is legacy free text.
  if (!str.startsWith('reason.')) return str;
  const [head, tail] = str.split(':', 2);
  const tpl = t(head);
  if (!tpl || tpl === head) {
    // No translation — fall back to a humanised version of the tail.
    return tail ? tail.replace(/_/g, ' ') : head.replace(/^reason\./, '').replace(/_/g, ' ');
  }
  const args = tail ? tail.split(',').map((s) => s.trim()) : [];
  return tpl.replace(/\{(\d+)\}/g, (_, i) => args[Number(i)] ?? '');
};

// Translate an event note: prefer the structured ``note_code`` +
// ``note_params``; fall back to the free-form ``note`` for legacy events.
const localizeNote = (ev, t) => {
  if (!ev) return '';
  const code = ev.note_code;
  if (code) {
    const tpl = t(code);
    if (tpl && tpl !== code) {
      const params = ev.note_params || {};
      return tpl.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? String(params[k]) : ''));
    }
  }
  return ev.note || '';
};

const SEG_TONE = {
  healthy:          { bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700' },
  draft:            { bg: 'bg-slate-50',    border: 'border-slate-200',   text: 'text-slate-700' },
  pending_approval: { bg: 'bg-blue-50',     border: 'border-blue-200',    text: 'text-blue-700' },
  missing_annex:    { bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-700' },
  wrong_version:    { bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-700' },
  unsigned:         { bg: 'bg-orange-50',   border: 'border-orange-200',  text: 'text-orange-700' },
  critical:         { bg: 'bg-red-50',      border: 'border-red-200',     text: 'text-red-700' },
  archived:         { bg: 'bg-zinc-100',    border: 'border-zinc-200',    text: 'text-zinc-600' },
};

const STATUS_TONE = {
  draft:            'bg-slate-100 text-slate-700',
  pending_approval: 'bg-blue-100 text-blue-700',
  approved:         'bg-cyan-100 text-cyan-700',
  sent:             'bg-indigo-100 text-indigo-700',
  opened:           'bg-purple-100 text-purple-700',
  signed:           'bg-emerald-100 text-emerald-700',
  active:           'bg-emerald-100 text-emerald-700',
  amended:          'bg-amber-100 text-amber-700',
  expired:          'bg-red-100 text-red-700',
  archived:         'bg-zinc-100 text-zinc-600',
  rejected:         'bg-red-100 text-red-700',
};

const SegBadge = ({ value }) => {
  const t = SEG_TONE[value] || SEG_TONE.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${t.bg} ${t.border} ${t.text}`}>
      {(value || '—').replace(/_/g, ' ')}
    </span>
  );
};
const StatusBadge = ({ value }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${STATUS_TONE[value] || 'bg-slate-100 text-slate-700'}`}>
    {(value || 'draft').replace(/_/g, ' ')}
  </span>
);

const KpiTile = ({ icon: Icon, label, value, hint, tone = 'neutral', testId, onClick, tooltip }) => {
  const toneCls = {
    neutral:  'bg-white border-[#E4E4E7]',
    good:     'bg-emerald-50 border-emerald-200',
    warn:     'bg-amber-50 border-amber-200',
    bad:      'bg-red-50 border-red-200',
    accent:   'bg-indigo-50 border-indigo-200',
  }[tone] || 'bg-white border-[#E4E4E7]';
  const interactive = onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : '';
  const tile = (
    <div className={`border rounded-2xl p-4 ${toneCls} ${interactive}`} onClick={onClick} data-testid={testId}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-[#71717A]">
        <Icon size={14} weight="bold" /> {label}
      </div>
      <div className="text-2xl font-bold text-[#18181B] mt-1 tabular-nums">{value}</div>
      {hint ? <div className="text-[11px] text-[#71717A] mt-0.5">{hint}</div> : null}
    </div>
  );
  return tooltip ? <HelpTooltip text={tooltip}>{tile}</HelpTooltip> : tile;
};

const TABS_FACTORY = (t) => ([
  { key: 'overview',  label: t('w15_tab_dashboard'),  icon: ChartLine,    tooltip: t('tip_w15_tab_dashboard') },
  { key: 'contracts', label: t('w15_tab_contracts'),  icon: ListBullets,  tooltip: t('tip_w15_tab_contracts') },
  { key: 'templates', label: t('w15_tab_templates'),  icon: Stack,        tooltip: t('tip_w15_tab_templates') },
  { key: 'approvals', label: t('w15_tab_approvals'),  icon: ShieldCheck,  tooltip: t('tip_w15_tab_approvals') },
  { key: 'risk',      label: t('w15_tab_risk'),       icon: Lifebuoy,     tooltip: t('tip_w15_tab_risk') },
  { key: 'timeline',  label: 'Timeline',              icon: Files,        tooltip: '' },
]);

export default function Contract360() {
  const navigate = useNavigate();
  const { t } = useLang();
  const TABS = useMemo(() => TABS_FACTORY(t), [t]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'overview');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState({});
  const [selectedId, setSelectedId] = useState(searchParams.get('id') || null);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const token = localStorage.getItem('token') || localStorage.getItem('access_token');
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const setData_ = (k, v) => setData((prev) => ({ ...prev, [k]: v }));
  const setLoad_ = (k, v) => setLoading((prev) => ({ ...prev, [k]: v }));

  // ─── Loaders ─────────────────────────────────────────────────────────
  const loadOverview = useCallback(async () => {
    setLoad_('overview', true);
    try {
      const { data } = await axios.get(`${API_URL}/api/contracts/overview`, { headers });
      setData_('overview', data?.data || null);
    } catch (e) { toast.error('Failed to load overview'); }
    finally { setLoad_('overview', false); }
  }, [headers]);

  const loadList = useCallback(async () => {
    setLoad_('list', true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter)   params.set('type', typeFilter);
      params.set('limit', '500');
      const { data } = await axios.get(`${API_URL}/api/contracts?${params.toString()}`, { headers });
      setData_('list', data?.items || []);
    } catch (e) { toast.error('Failed to load contracts'); }
    finally { setLoad_('list', false); }
  }, [headers, statusFilter, typeFilter]);

  const loadTemplates = useCallback(async () => {
    setLoad_('templates', true);
    try {
      const { data } = await axios.get(`${API_URL}/api/contracts/templates`, { headers });
      setData_('templates', data?.items || []);
    } catch (e) { toast.error('Failed to load templates'); }
    finally { setLoad_('templates', false); }
  }, [headers]);

  const loadRisk = useCallback(async () => {
    setLoad_('risk', true);
    try {
      const { data } = await axios.get(`${API_URL}/api/contracts/risk`, { headers });
      setData_('risk', data?.data || null);
    } catch (e) { toast.error('Failed to load risk'); }
    finally { setLoad_('risk', false); }
  }, [headers]);

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    setLoad_('detail', true);
    try {
      const { data } = await axios.get(`${API_URL}/api/contracts/${id}`, { headers });
      setData_('detail', data?.data || null);
    } catch (e) { toast.error('Failed to load contract'); }
    finally { setLoad_('detail', false); }
  }, [headers]);

  // ─── tab switching ───────────────────────────────────────────────────
  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      if (selectedId) next.set('id', selectedId); else next.delete('id');
      return next;
    });
    if (tab === 'overview')  loadOverview();
    if (tab === 'contracts') loadList();
    if (tab === 'templates') loadTemplates();
    if (tab === 'approvals') loadList();
    if (tab === 'risk')      loadRisk();
    if (tab === 'timeline' && selectedId) loadDetail(selectedId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, statusFilter, typeFilter]);

  useEffect(() => { if (selectedId) loadDetail(selectedId); }, [selectedId, loadDetail]);

  const refresh = () => {
    if (tab === 'overview')  loadOverview();
    if (tab === 'contracts') loadList();
    if (tab === 'templates') loadTemplates();
    if (tab === 'approvals') loadList();
    if (tab === 'risk')      loadRisk();
    if (tab === 'timeline' && selectedId) loadDetail(selectedId);
  };

  // ─── lifecycle actions ───────────────────────────────────────────────
  const doAction = useCallback(async (id, action, body = null) => {
    try {
      const url = `${API_URL}/api/contracts/${id}/${action}`;
      const res = await axios.post(url, body || {}, { headers });
      const c = res.data?.data;
      if (c) {
        toast.success(`${action} → ${c.status}`);
        setData_('detail', c);
        // refresh list / overview in background
        loadList(); loadOverview();
        if (action === 'amend' && c.id !== id) setSelectedId(c.id);
      }
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message;
      toast.error(`${action} failed: ${msg}`);
    }
  }, [headers, loadList, loadOverview]);

  const createFromTemplate = useCallback(async (templateKey) => {
    // For "purchase" template we open a richer BG modal that captures
    // ВЪЗЛОЖИТЕЛ / ПС / financial terms before creating the contract.
    if (templateKey === 'purchase' || templateKey === 'agency') {
      setBgCreateOpen({ template: templateKey });
      return;
    }
    try {
      const tpl = (data.templates || []).find((t) => t.key === templateKey);
      const { data: res } = await axios.post(
        `${API_URL}/api/contracts`,
        { template: templateKey, title: `${tpl?.name || templateKey} — ${new Date().toLocaleDateString()}` },
        { headers },
      );
      const c = res?.data;
      if (c) {
        toast.success(`Contract ${c.id} created`);
        setSelectedId(c.id);
        setTab('timeline');
        loadList();
      }
    } catch (e) {
      toast.error(`Create failed: ${e?.response?.data?.detail || e.message}`);
    }
  }, [headers, data.templates, loadList]);

  // ─── BG contract creation modal (Договор за поръчка) ─────────────────
  const [bgCreateOpen, setBgCreateOpen] = useState(null);

  const onBgCreate = useCallback(async (formValues) => {
    try {
      const { data: res } = await axios.post(
        `${API_URL}/api/contracts`,
        formValues,
        { headers },
      );
      const c = res?.data;
      if (c) {
        toast.success(t('c360_toast_contract_created') ? t('c360_toast_contract_created').replace('{n}', c.contract_number || c.id) : `Contract ${c.contract_number || c.id} created`);
        setSelectedId(c.id);
        setBgCreateOpen(null);
        setTab('timeline');
        loadList();
      }
    } catch (e) {
      toast.error(`${e?.response?.data?.detail || e.message}`);
    }
  }, [headers, loadList]);

  // ─── Download a freshly rendered BG PDF for a contract ───────────────
  const onRenderPdf = useCallback(async (contractId) => {
    try {
      const { data: res } = await axios.post(
        `${API_URL}/api/contracts/${contractId}/render-pdf`,
        { language: 'bg' },
        { headers },
      );
      const url = res?.data?.download_url;
      if (url) {
        // Stream from /api/... with auth in a new tab via fetch+blob
        const r = await fetch(`${API_URL}${url}`, { headers });
        const blob = await r.blob();
        const a = document.createElement('a');
        const obj = window.URL.createObjectURL(blob);
        a.href = obj;
        a.download = `Dogovor_${contractId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(obj);
        toast.success(t('c360_toast_pdf_ready') || 'PDF ready');
      } else {
        toast.error(t('c360_toast_pdf_failed') || 'PDF render failed');
      }
    } catch (e) {
      toast.error(`${t('c360_toast_pdf_failed') || 'PDF render failed'}: ${e?.response?.data?.detail || e.message}`);
    }
  }, [headers]);

  // ─── derived ─────────────────────────────────────────────────────────
  const ccy = data.overview?.currency || 'EUR';
  const totals = data.overview?.totals || {};
  const list = data.list || [];
  const pendingApprovals = useMemo(() => list.filter((c) => c.status === 'pending_approval'), [list]);

  return (
    <div className="min-h-full" data-testid="contract360-page">
      {/* HEADER */}
      <PageHeader
        icon={FileText}
        title={t('w15_title')}
        subtitle={t('w15_subtitle')}
        actions={(
          <>
            <HeaderActionButton icon={Plus} label={t('w17_new')} onClick={() => setTab('templates')} variant="primary" testId="new-contract-btn" responsiveIconOnly />
            <RefreshButton onClick={refresh} testId="refresh-btn" />
          </>
        )}
        testId="contract360-header"
      />

      <div className="mb-4"><RoleZoneBadge variant="wave360" /></div>

      {/* TABS */}
      <PageTabs
        tabs={TABS}
        active={tab}
        onChange={setTab}
        testId="contract360-tabs"
      />

      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-5">

        {/* ============================== OVERVIEW ============================== */}
        {tab === 'overview' ? (
          loading.overview && !data.overview ? (
            <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-[#18181B] border-t-transparent rounded-full animate-spin" /></div>
          ) : data.overview ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="overview-kpis">
                <KpiTile icon={FileText}    label="Contracts"        value={totals.contracts || 0}                  hint={`scope: ${data.overview.scope?.all ? 'all' : data.overview.scope?.managers + ' mgr'}`} tooltip={t('tip_w15_tab_dashboard')} />
                <KpiTile icon={CurrencyEur} label="Total value"      value={fmt(totals.total_value, ccy)}            hint={`${fmt(totals.active_value, ccy)} active`} tone="accent" tooltip={t('tip_w12a_kpi_revenue')} />
                <KpiTile icon={ShieldCheck} label="Pending approvals" value={totals.pending_approvals || 0}          hint="awaiting internal sign-off" tone={totals.pending_approvals > 0 ? 'warn' : 'good'} onClick={() => setTab('approvals')} tooltip={t('tip_w16_kpi_pending')} testId="kpi-pending" />
                <KpiTile icon={Warning}     label="Overdue signature" value={totals.overdue_signature || 0}          hint={`${fmt(totals.unsigned_value, ccy)} at risk`} tone={totals.overdue_signature > 0 ? 'bad' : 'good'} onClick={() => setTab('risk')} tooltip={t('tip_w16_kpi_unsigned')} testId="kpi-overdue" />
                <KpiTile icon={Clock}       label="Expiring soon"    value={totals.expiring_soon || 0}              hint="≤ 7 days" tone={totals.expiring_soon > 0 ? 'warn' : 'good'} tooltip={t('tip_w16_kpi_expiring')} />
                <KpiTile icon={CheckCircle} label="Healthy"          value={totals.healthy_count || 0}              hint="active + signed + papered" tone="good" tooltip={t('tip_w15_tab_risk')} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white border border-[#E4E4E7] rounded-2xl p-4" data-testid="overview-by-segment">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-[#71717A] mb-3">{t('ct_health_distribution')}</div>
                  {Object.entries(data.overview.by_segment || {}).length === 0 ? (
                    <div className="text-sm text-[#71717A] py-2">{t('ct_no_contracts_yet')}</div>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(data.overview.by_segment || {}).filter(([, v]) => v > 0).map(([seg, count]) => (
                        <div key={seg} className="flex items-center gap-3">
                          <div className="w-40"><SegBadge value={seg} /></div>
                          <div className="flex-1 h-2 bg-[#F4F4F5] rounded-full overflow-hidden">
                            <div className={`h-full ${SEG_TONE[seg]?.bg.replace('-50', '-400') || 'bg-slate-400'}`} style={{ width: `${Math.min(100, (count / Math.max(1, totals.contracts || 1)) * 100)}%` }} />
                          </div>
                          <div className="w-10 text-right tabular-nums text-[12px] font-semibold text-[#18181B]">{count}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bg-white border border-[#E4E4E7] rounded-2xl p-4" data-testid="overview-by-status">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-[#71717A] mb-3">{t('ct_by_status')}</div>
                  {Object.entries(data.overview.by_status || {}).length === 0 ? (
                    <div className="text-sm text-[#71717A] py-2">{t('ct_no_contracts_yet')}</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(data.overview.by_status || {}).map(([status, count]) => (
                        <button key={status} onClick={() => { setStatusFilter(status); setTab('contracts'); }} className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#E4E4E7] rounded-xl hover:bg-[#FAFAFA] text-left">
                          <StatusBadge value={status} />
                          <span className="text-[13px] font-semibold tabular-nums text-[#18181B]">{count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-[#E4E4E7] rounded-2xl p-4" data-testid="overview-at-risk">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-[#71717A]">{t('ct_top_at_risk')}</div>
                  <button onClick={() => setTab('risk')} className="text-[11px] font-semibold text-[#18181B] hover:underline">{t('ct_view_all')} →</button>
                </div>
                {(data.overview.top_at_risk || []).length === 0 ? (
                  <div className="text-sm text-[#71717A] py-2">{t('ct_no_at_risk')}</div>
                ) : (
                  <div className="divide-y divide-[#F4F4F5]">
                    {data.overview.top_at_risk.map((c) => (
                      <button key={c.id} onClick={() => { setSelectedId(c.id); setTab('timeline'); }} className="w-full grid grid-cols-12 gap-2 py-2 items-center text-left text-[13px] hover:bg-[#FAFAFA] px-2 -mx-2 rounded">
                        <div className="col-span-4 truncate font-medium text-[#18181B]">{c.title || c.id}<ArrowSquareOut size={10} className="inline ml-1 text-[#A1A1AA]" /></div>
                        <div className="col-span-2"><StatusBadge value={c.status} /></div>
                        <div className="col-span-2"><SegBadge value={c.segment} /></div>
                        <div className="col-span-2 text-right tabular-nums font-semibold text-[#18181B]">{fmt(c.amount, ccy)}</div>
                        <div className="col-span-2 text-[11px] text-[#71717A] truncate">{(c.reasons || [])[0]}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null
        ) : null}

        {/* ============================== CONTRACTS ============================ */}
        {tab === 'contracts' ? (
          <>
            <div className="bg-white border border-[#E4E4E7] rounded-2xl p-3 flex flex-wrap gap-2 items-center" data-testid="contracts-filters">
              <WhiteSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-w-[160px]" data-testid="filter-status">
                <option value="">{t('all_statuses')}</option>
                {['draft','pending_approval','approved','sent','opened','signed','active','amended','expired','archived','rejected'].map((s) => <option key={s} value={s}>{t(`contract_status_${s}`)}</option>)}
              </WhiteSelect>
              <WhiteSelect value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="min-w-[160px]" data-testid="filter-type">
                <option value="">{t('all_types')}</option>
                {['purchase','agency','transport','custom'].map((tp) => <option key={tp} value={tp}>{t(`contract_type_${tp}`)}</option>)}
              </WhiteSelect>
              {statusFilter || typeFilter ? <button onClick={() => { setStatusFilter(''); setTypeFilter(''); }} className="text-[11px] text-[#71717A] hover:underline">{t('clear') || 'Clear'}</button> : null}
              <div className="ml-auto text-[12px] text-[#71717A]">{list.length} {t('w15_tab_contracts').toLowerCase()}</div>
            </div>
            <ContractsTable rows={list} loading={loading.list} ccy={ccy} t={t} onSelect={(id) => { setSelectedId(id); setTab('timeline'); }} onDeal={(deal_id) => navigate(`/admin/deals/${deal_id}/360`)} onRenderPdf={onRenderPdf} />
          </>
        ) : null}

        {/* ============================== TEMPLATES ============================ */}
        {tab === 'templates' ? (
          loading.templates && !data.templates ? (
            <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-[#18181B] border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="templates-grid">
              {(data.templates || []).map((t) => (
                <div key={t.key} className="bg-white border border-[#E4E4E7] rounded-2xl p-5 flex flex-col" data-testid={`template-card-${t.key}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-lg font-bold text-[#18181B]">{t.name}</div>
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">{t.type}</span>
                  </div>
                  <p className="text-[13px] text-[#52525B] mb-3">{t.description}</p>
                  <div className="text-[11px] text-[#71717A] mb-1 uppercase tracking-wider font-bold">Approval chain</div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(t.approval_chain || []).map((s, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[11px] bg-zinc-50 border border-zinc-200 rounded-full px-2 py-0.5 text-zinc-700">{s.replace(/_/g, ' ')}{i < (t.approval_chain || []).length - 1 ? ' →' : ''}</span>
                    ))}
                  </div>
                  <div className="text-[11px] text-[#71717A] mb-1 uppercase tracking-wider font-bold">Required annexes</div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(t.required_annexes || []).length === 0 ? <span className="text-[12px] text-[#A1A1AA]">none</span> : null}
                    {(t.required_annexes || []).map((a) => (
                      <span key={a} className="text-[11px] bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 text-amber-700">{a.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                  <div className="text-[11px] text-[#71717A] mb-3">Valid {t.valid_days || 30} days · signature {t.signature_required ? 'required' : 'optional'}</div>
                  <button onClick={() => createFromTemplate(t.key)} className="mt-auto inline-flex items-center justify-center gap-2 px-3 py-2 bg-[#18181B] text-white rounded-xl text-[12px] font-semibold hover:bg-black" data-testid={`create-${t.key}`}>
                    <Plus size={14} weight="bold" /> Create {t.name}
                  </button>
                </div>
              ))}
            </div>
          )
        ) : null}

        {/* ============================== APPROVALS ============================ */}
        {tab === 'approvals' ? (
          loading.list && !list.length ? (
            <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-[#18181B] border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div data-testid="approvals-queue">
              {pendingApprovals.length === 0 ? (
                <div className="bg-white border border-[#E4E4E7] rounded-2xl p-6 text-center text-sm text-[#71717A]">{t('ct_no_pending')}</div>
              ) : (
                <div className="bg-white border border-[#E4E4E7] rounded-2xl overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead className="bg-[#FAFAFA] text-left text-[10px] uppercase tracking-wider text-[#71717A]">
                      <tr><th className="px-4 py-3">{t('contract') || 'Contract'}</th><th className="px-4 py-3">{t('type') || 'Type'}</th><th className="px-4 py-3">{t('next_step') || 'Next step'}</th><th className="px-4 py-3 text-right">{t('amount') || 'Amount'}</th><th className="px-4 py-3">{t('actions') || 'Actions'}</th></tr>
                    </thead>
                    <tbody className="divide-y divide-[#F4F4F5]">
                      {pendingApprovals.map((c) => {
                        const next = (c.approvals || []).find((a) => a.status === 'pending')?.step;
                        return (
                          <tr key={c.id} className="hover:bg-[#FAFAFA]">
                            <td className="px-4 py-3"><button className="text-left font-medium text-[#18181B] hover:underline" onClick={() => { setSelectedId(c.id); setTab('timeline'); }}>{c.title || c.id}</button></td>
                            <td className="px-4 py-3 capitalize">{c.type && t(`contract_type_${c.type}`) !== `contract_type_${c.type}` ? t(`contract_type_${c.type}`) : c.type}</td>
                            <td className="px-4 py-3">{next ? <StatusBadge value={next} /> : <span className="text-[#A1A1AA]">—</span>}</td>
                            <td className="px-4 py-3 text-right tabular-nums">{fmt(c.amount, c.currency || 'EUR')}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button onClick={() => doAction(c.id, 'approve', { comment: 'Approved via queue' })} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-semibold hover:bg-emerald-700" data-testid={`approve-${c.id}`}><CheckCircle size={12} weight="bold" /> {t('approve') || 'Approve'}</button>
                                <button onClick={() => doAction(c.id, 'reject',  { comment: 'Rejected via queue' })} className="inline-flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded-lg text-[11px] font-semibold hover:bg-red-700" data-testid={`reject-${c.id}`}><XCircle size={12} weight="bold" /> {t('reject') || 'Reject'}</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        ) : null}

        {/* ============================== RISK ================================= */}
        {tab === 'risk' ? (
          loading.risk && !data.risk ? (
            <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-[#18181B] border-t-transparent rounded-full animate-spin" /></div>
          ) : data.risk ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="risk-kpis">
                <KpiTile icon={Lifebuoy}    label="Contracts at risk" value={data.risk.total || 0} hint={`${fmt(data.risk.risk_value, ccy)} exposed`} tone={data.risk.total > 0 ? 'bad' : 'good'} />
                {Object.entries(data.risk.by_segment || {}).filter(([, v]) => v > 0).slice(0, 3).map(([seg, count]) => (
                  <KpiTile key={seg} icon={Warning} label={seg.replace(/_/g, ' ')} value={count} tone="warn" testId={`risk-seg-${seg}`} />
                ))}
              </div>
              <div className="bg-white border border-[#E4E4E7] rounded-2xl overflow-x-auto">
                <table className="w-full text-[13px]" data-testid="risk-table">
                  <thead className="bg-[#FAFAFA] text-left text-[10px] uppercase tracking-wider text-[#71717A]">
                    <tr><th className="px-4 py-3">Contract</th><th className="px-4 py-3">Segment</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Score</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Reason</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4F4F5]">
                    {(data.risk.items || []).length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-[#71717A]">{t('ct_no_risk')}</td></tr>
                    ) : (data.risk.items || []).map((c) => (
                      <tr key={c.id} className="hover:bg-[#FAFAFA] cursor-pointer" onClick={() => { setSelectedId(c.id); setTab('timeline'); }} data-testid={`risk-row-${c.id}`}>
                        <td className="px-4 py-3 font-medium text-[#18181B] truncate max-w-[280px]">{c.title || c.id}</td>
                        <td className="px-4 py-3"><SegBadge value={c.segment} /></td>
                        <td className="px-4 py-3"><StatusBadge value={c.status} /></td>
                        <td className="px-4 py-3 text-right tabular-nums">{c.score}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{fmt(c.amount, ccy)}</td>
                        <td className="px-4 py-3 text-[11px] text-[#71717A] truncate max-w-[280px]">{(c.reasons || [])[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null
        ) : null}

        {/* ============================== TIMELINE ============================= */}
        {tab === 'timeline' ? (
          !selectedId ? (
            <div className="bg-white border border-[#E4E4E7] rounded-2xl p-6 text-center text-sm text-[#71717A]">{t('w15_pick_a_contract')} <button className="underline" onClick={() => setTab('contracts')}>{t('w15_tab_contracts')}</button>{t('w15_pick_a_contract_from')} <button className="underline" onClick={() => setTab('risk')}>{t('w15_tab_risk')}</button>{t('w15_pick_a_contract_or')} <button className="underline" onClick={() => setTab('overview')}>{t('w15_tab_overview')}</button> {t('w15_pick_a_contract_see')}</div>
          ) : loading.detail && !data.detail ? (
            <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-[#18181B] border-t-transparent rounded-full animate-spin" /></div>
          ) : data.detail ? (
            <ContractDetail c={data.detail} onAction={doAction} onOpenDeal={(d) => navigate(`/admin/deals/${d}/360`)} onRenderPdf={onRenderPdf} />
          ) : null
        ) : null}
      </motion.div>

      {/* BG contract creation modal */}
      {bgCreateOpen ? (
        <BgContractCreateModal
          template={bgCreateOpen.template}
          onClose={() => setBgCreateOpen(null)}
          onSubmit={onBgCreate}
          token={token}
        />
      ) : null}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────
const ContractsTable = ({ rows, loading, ccy, onSelect, onDeal, onRenderPdf, t = (k) => k }) => {
  if (loading && !rows.length) return <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-[#18181B] border-t-transparent rounded-full animate-spin" /></div>;
  if (!rows.length) return <div className="bg-white border border-[#E4E4E7] rounded-2xl p-6 text-center text-sm text-[#71717A]">{t('ct_no_contracts_create')}</div>;
  return (
    <div className="bg-white border border-[#E4E4E7] rounded-2xl overflow-x-auto">
      <table className="w-full text-[13px]" data-testid="contracts-table">
        <thead className="bg-[#FAFAFA] text-left text-[10px] uppercase tracking-wider text-[#71717A]">
          <tr>
            <th className="px-4 py-3">{t('contract_no') || 'No.'}</th>
            <th className="px-4 py-3">{t('title') || 'Title'}</th>
            <th className="px-4 py-3">{t('type') || 'Type'}</th>
            <th className="px-4 py-3">{t('status') || 'Status'}</th>
            <th className="px-4 py-3">{t('health') || 'Health'}</th>
            <th className="px-4 py-3 text-right">{t('amount') || 'Amount'}</th>
            <th className="px-4 py-3">{t('valid_to') || 'Valid to'}</th>
            <th className="px-4 py-3">{t('deal') || 'Deal'}</th>
            <th className="px-4 py-3 text-right">PDF</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F4F4F5]">
          {rows.map((c) => (
            <tr key={c.id} className="hover:bg-[#FAFAFA]" data-testid={`row-${c.id}`}>
              <td className="px-4 py-3 text-[12px] font-mono text-[#3F3F46] tabular-nums">{c.contract_number || '—'}</td>
              <td className="px-4 py-3"><button onClick={() => onSelect(c.id)} className="text-left font-medium text-[#18181B] hover:underline">{c.title || c.id}</button></td>
              <td className="px-4 py-3 capitalize">{c.type || c.template}</td>
              <td className="px-4 py-3"><StatusBadge value={c.status} /></td>
              <td className="px-4 py-3"><SegBadge value={c.health?.segment} /></td>
              <td className="px-4 py-3 text-right tabular-nums">{fmt(c.amount, c.currency || ccy)}</td>
              <td className="px-4 py-3 text-[12px] text-[#71717A]">{fmtDate(c.valid_to)}</td>
              <td className="px-4 py-3">{c.deal_id ? <button className="text-[11px] text-[#18181B] hover:underline inline-flex items-center gap-1" onClick={() => onDeal(c.deal_id)}>{c.deal_id} <ArrowSquareOut size={10} /></button> : <span className="text-[#A1A1AA]">—</span>}</td>
              <td className="px-4 py-3 text-right">
                {onRenderPdf ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRenderPdf(c.id); }}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-[#FEAE00] hover:bg-[#F59E0B] text-[#18181B] rounded text-[11px] font-semibold"
                    title={t('c360_download_pdf') || 'Download PDF'}
                    data-testid={`row-pdf-${c.id}`}
                  >
                    <FileText size={11} weight="bold" /> PDF
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ContractDetail = ({ c, onAction, onOpenDeal, onRenderPdf }) => {
  const { t } = useLang();
  const status = c.status;
  const canSend     = ['draft', 'approved'].includes(status);
  const canApprove  = status === 'pending_approval';
  const canReject   = status === 'pending_approval';
  const canSign     = ['approved', 'sent', 'opened'].includes(status);
  const canAmend    = ['active', 'sent', 'signed'].includes(status);
  const canArchive  = !['archived'].includes(status);

  // Map raw template/type → translatable heading. Keeps the UI heading purely
  // in the user's locale even when the contract title field was seeded in
  // another language (legacy data).
  const templateKey = (() => {
    const v = (c.template || c.type || '').toString().toLowerCase();
    if (v.includes('calc'))       return 'c360_title_calculator';
    if (v.includes('commission')) return 'c360_title_commission';
    if (v.includes('supplement')) return 'c360_title_supplement';
    if (v.includes('purchase'))   return 'c360_title_purchase';
    return 'c360_title_fallback';
  })();
  const heading = t(templateKey) || c.title || c.id;

  return (
    <div className="space-y-4" data-testid="contract-detail">
      <div className="bg-white border border-[#E4E4E7] rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <div className="text-xl font-bold text-[#18181B]" data-testid="contract-heading">{heading}</div>
            <div className="text-[12px] text-[#71717A] mt-0.5 flex flex-wrap items-center gap-2">
              <StatusBadge value={c.status} />
              <SegBadge value={c.health?.segment} />
              <span>{t('c360_score') || 'Score'} {c.health?.score}</span>
              {c.deal_id ? <button onClick={() => onOpenDeal(c.deal_id)} className="text-[#18181B] underline inline-flex items-center gap-1">{t('c360_deal') || 'Deal'} {c.deal_id} <ArrowSquareOut size={10} /></button> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canSend     ? <button onClick={() => onAction(c.id, 'send')}    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[12px] font-semibold hover:bg-indigo-700" data-testid="action-send"><PaperPlaneTilt size={12} weight="bold" /> {status === 'draft' ? (t('c360_send_for_approval') || 'Send for approval') : (t('c360_send_to_customer') || 'Send to customer')}</button> : null}
            {canApprove  ? <button onClick={() => onAction(c.id, 'approve', { comment: 'OK' })} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[12px] font-semibold hover:bg-emerald-700" data-testid="action-approve"><CheckCircle size={12} weight="bold" /> {t('c360_approve_step') || 'Approve step'}</button> : null}
            {canReject   ? <button onClick={() => onAction(c.id, 'reject',  { comment: 'Rejected' })} className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-[12px] font-semibold hover:bg-red-700" data-testid="action-reject"><XCircle size={12} weight="bold" /> {t('c360_reject') || 'Reject'}</button> : null}
            {canSign     ? <button onClick={() => onAction(c.id, 'sign',    { signer_name: 'Customer', method: 'electronic' })} className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#18181B] text-white rounded-lg text-[12px] font-semibold hover:bg-black" data-testid="action-sign"><PencilSimple size={12} weight="bold" /> {t('c360_sign') || 'Sign'}</button> : null}
            {canAmend    ? <button onClick={() => onAction(c.id, 'amend',   { reason: 'Manual amendment' })} className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-[12px] font-semibold hover:bg-amber-600" data-testid="action-amend"><PencilSimple size={12} weight="bold" /> {t('c360_amend') || 'Amend'}</button> : null}
            {canArchive  ? <button onClick={() => onAction(c.id, 'archive')} className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#E4E4E7] text-[#52525B] rounded-lg text-[12px] font-semibold hover:bg-[#FAFAFA]" data-testid="action-archive"><Archive size={12} weight="bold" /> {t('c360_archive') || 'Archive'}</button> : null}
            {onRenderPdf ? <button onClick={() => onRenderPdf(c.id)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FEAE00] text-[#18181B] rounded-lg text-[12px] font-semibold hover:bg-[#F59E0B]" data-testid="action-render-pdf"><FileText size={12} weight="bold" /> {t('c360_download_pdf') || 'Download PDF'}</button> : null}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
          <div><div className="text-[10px] uppercase text-[#71717A] tracking-wider font-bold">{t('c360_contract_no_label') || 'Contract #'}</div><div className="text-[14px] font-semibold tabular-nums">{c.contract_number || '—'}</div></div>
          <div><div className="text-[10px] uppercase text-[#71717A] tracking-wider font-bold">{t('c360_amount_label') || 'Amount'}</div><div className="text-[14px] font-semibold tabular-nums">{fmt(c.amount, c.currency || 'EUR')}</div></div>
          <div><div className="text-[10px] uppercase text-[#71717A] tracking-wider font-bold">{t('c360_valid_label') || 'Valid'}</div><div className="text-[13px]">{fmtDate(c.valid_from)} → {fmtDate(c.valid_to)}</div></div>
          <div><div className="text-[10px] uppercase text-[#71717A] tracking-wider font-bold">{t('c360_sent_label') || 'Sent'}</div><div className="text-[13px]">{fmtDate(c.sent_at)}</div></div>
          <div><div className="text-[10px] uppercase text-[#71717A] tracking-wider font-bold">{t('c360_signed_label') || 'Signed'}</div><div className="text-[13px]">{fmtDate(c.signed_at)}</div></div>
        </div>
        {(c.health?.reasons || []).length ? (
          <div className="mt-3 pt-3 border-t border-[#F4F4F5]">
            <div className="text-[10px] uppercase text-[#71717A] tracking-wider font-bold mb-1">{t('c360_health_reasons') || 'Health reasons'}</div>
            <div className="text-[12px] text-[#52525B]">{(c.health?.reasons || []).map((r) => localizeReason(r, t)).join(' · ')}</div>
          </div>
        ) : null}
      </div>

      {/* Approvals */}
      <div className="bg-white border border-[#E4E4E7] rounded-2xl p-4" data-testid="detail-approvals">
        <div className="text-[10px] uppercase tracking-wider font-bold text-[#71717A] mb-3">{t('c360_approval_chain') || 'Approval chain'}</div>
        {(c.approvals || []).length === 0 ? (
          <div className="text-sm text-[#71717A]">{t('c360_not_sent_yet') || 'Not sent yet. The chain is:'} {(c.approval_chain || []).join(' → ')}</div>
        ) : (
          <div className="space-y-2">
            {c.approvals.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-[13px]">
                <div className="flex items-center gap-2">
                  {a.status === 'approved' ? <CheckCircle size={14} weight="bold" className="text-emerald-600" /> : a.status === 'rejected' ? <XCircle size={14} weight="bold" className="text-red-600" /> : <Clock size={14} weight="bold" className="text-[#A1A1AA]" />}
                  <span className="font-semibold capitalize">{a.step.replace(/_/g, ' ')}</span>
                  <StatusBadge value={a.status} />
                </div>
                <div className="text-[11px] text-[#71717A]">{a.actor_name || ''} {a.at ? `· ${fmtDate(a.at)}` : ''}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attachments */}
      <div className="bg-white border border-[#E4E4E7] rounded-2xl p-4" data-testid="detail-attachments">
        <div className="text-[10px] uppercase tracking-wider font-bold text-[#71717A] mb-3">{t('c360_attachments') || 'Attachments'} ({(c.attachments || []).length})</div>
        {(c.required_annexes || []).length ? (
          <div className="mb-3">
            <div className="text-[11px] text-[#71717A] mb-1">{t('c360_required_annexes') || 'Required annexes:'}</div>
            <div className="flex flex-wrap gap-1">
              {(c.required_annexes || []).map((a) => {
                const present = (c.attachments || []).some((att) => (att.kind_key || att.filename || '').toLowerCase().includes(a.toLowerCase()));
                return (
                  <span key={a} className={`text-[11px] rounded-full px-2 py-0.5 border ${present ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>{present ? '✓ ' : '⏳ '}{a.replace(/_/g, ' ')}</span>
                );
              })}
            </div>
          </div>
        ) : null}
        {(c.attachments || []).length === 0 ? (
          <div className="text-sm text-[#71717A]">{t('c360_no_attachments') || 'No attachments yet.'}</div>
        ) : (
          <div className="divide-y divide-[#F4F4F5]">
            {c.attachments.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 text-[13px]">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-[#71717A]" />
                  <span className="font-medium">{a.filename}</span>
                  <span className="text-[11px] text-[#71717A]">{a.kind}</span>
                </div>
                <div className="text-[11px] text-[#71717A]">{fmtDate(a.uploaded_at)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-white border border-[#E4E4E7] rounded-2xl p-4" data-testid="detail-timeline">
        <div className="text-[10px] uppercase tracking-wider font-bold text-[#71717A] mb-3">{t('c360_timeline_label') || 'Timeline'}</div>
        {(c.events || []).length === 0 ? (
          <div className="text-sm text-[#71717A]">{t('c360_no_events') || 'No events yet.'}</div>
        ) : (
          <div className="space-y-3">
            {(c.events || []).slice().reverse().map((e, i) => {
              const eventKey = `c360_event_${(e.kind || '').toLowerCase()}`;
              const eventLabel = t(eventKey) || (e.kind || '').replace(/_/g, ' ');
              const note = localizeNote(e, t);
              return (
                <div key={i} className="flex items-start gap-3 text-[13px]">
                  <div className="w-2 h-2 rounded-full bg-[#18181B] mt-1.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold capitalize">{eventLabel}</span>
                      <span className="text-[11px] text-[#71717A]">{fmtDate(e.at)}</span>
                    </div>
                    <div className="text-[12px] text-[#52525B]">{note}{e.actor_name ? ` · ${e.actor_name}` : ''}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Versions block intentionally removed per UX request — version
          chrome (v1, v2 …) is hidden from the contract page. The data is
          still recorded in the backend and can be exposed again on demand. */}
    </div>
  );
};


// ─── BG Contract Creation Modal ─────────────────────────────────────────
// Captures all required Bulgarian commission-contract fields:
//   ВЪЗЛОЖИТЕЛ (ЕГН/ЛНЧ, адрес)
//   Параметри МПС (марка/модел/година/VIN/държава/аукцион/max bid/бюджет)
//   Финансови условия (депозит %, мин, fee)
// Posts to POST /api/contracts which now understands these BG shortcut
// fields and persists them into the lifecycle document.
const BgContractCreateModal = ({ template, onClose, onSubmit, token }) => {
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    customer_id: '',
    title: '',
    place: 'София',
    language: 'bg',
    client_national_id: '',
    client_address: '',
    vehicle_spec: {
      make: '', model: '', year: '', vin: '',
      country: 'САЩ', auction: '', max_bid: '', total_budget: '',
      currency: 'EUR',
    },
    financial_terms: {
      deposit_pct: 15,
      deposit_min_eur: 1000,
      executor_fee_eur: 800,
      full_prepay_platforms: ['MANHEIM', 'ENCAR'],
      duration_days: 180,
    },
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoadingCustomers(true);
    axios.get(`${API_URL}/api/customers`, {
      params: { limit: 500 },
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => {
      setCustomers(r.data?.items || r.data?.customers || []);
    }).catch(() => {}).finally(() => setLoadingCustomers(false));
  }, [token]);

  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return customers.slice(0, 100);
    return customers.filter((c) => {
      const name = ((c.firstName || '') + ' ' + (c.lastName || '') + ' ' + (c.name || '') + ' ' + (c.email || '') + ' ' + (c.phone || '')).toLowerCase();
      return name.includes(q);
    }).slice(0, 100);
  }, [customers, search]);

  const setVS = (k, v) => setForm((f) => ({ ...f, vehicle_spec: { ...f.vehicle_spec, [k]: v } }));
  const setFT = (k, v) => setForm((f) => ({ ...f, financial_terms: { ...f.financial_terms, [k]: v } }));

  const submit = async () => {
    if (!form.customer_id) { toast.error('Изберете ВЪЗЛОЖИТЕЛ'); return; }
    setSubmitting(true);
    const vs = { ...form.vehicle_spec };
    if (vs.year) vs.year = parseInt(vs.year) || null;
    ['max_bid', 'total_budget'].forEach((k) => { if (vs[k]) vs[k] = parseFloat(vs[k]) || null; });
    const ft = { ...form.financial_terms };
    ['deposit_pct', 'deposit_min_eur', 'executor_fee_eur', 'duration_days'].forEach((k) => {
      if (ft[k]) ft[k] = parseFloat(ft[k]) || null;
    });
    const amount = vs.total_budget || vs.max_bid || null;
    const payload = {
      template,
      customer_id: form.customer_id,
      title: form.title || `Договор за поръчка — ${(form.vehicle_spec.make || '')} ${(form.vehicle_spec.model || '')}`.trim(),
      place: form.place,
      language: form.language,
      currency: vs.currency || 'EUR',
      amount,
      client_national_id: form.client_national_id || null,
      client_address: form.client_address || null,
      vehicle_spec: vs,
      financial_terms: ft,
    };
    await onSubmit(payload);
    setSubmitting(false);
  };

  const fieldCls = 'w-full h-9 px-3 rounded-lg border border-[#E4E4E7] bg-white text-[13px] focus:outline-none focus:border-[#18181B]';
  const lblCls = 'block text-[10px] uppercase tracking-wider font-bold text-[#71717A] mb-1';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" data-testid="bg-contract-modal">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8">
        <div className="px-5 py-4 border-b border-[#E4E4E7] flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h3 className="text-base font-bold text-[#18181B]">Нов договор за поръчка</h3>
            <p className="text-[11px] text-[#71717A] mt-0.5">ПМ АВТО ГРУП ЕООД · {template === 'agency' ? 'Agency' : 'Покупка/поръчка'}</p>
          </div>
          <button onClick={onClose} className="text-[#71717A] hover:text-[#18181B]" data-testid="bg-contract-close">✕</button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* ВЪЗЛОЖИТЕЛ */}
          <div>
            <div className="text-[11px] uppercase tracking-wider font-bold text-[#3F3F46] mb-2">1. ВЪЗЛОЖИТЕЛ (клиент)</div>
            <input
              type="text"
              placeholder="Търсене по име, имейл, телефон…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${fieldCls} mb-2`}
              data-testid="bg-customer-search"
            />
            <select
              value={form.customer_id}
              onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))}
              className={fieldCls}
              data-testid="bg-customer-select"
            >
              <option value="">— Изберете клиент {loadingCustomers ? '(зарежда…)' : ''} —</option>
              {filteredCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {(c.name || `${c.firstName || ''} ${c.lastName || ''}`).trim() || c.id} {c.email ? `· ${c.email}` : ''} {c.phone ? `· ${c.phone}` : ''}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div>
                <label className={lblCls}>ЕГН / ЛНЧ</label>
                <input type="text" value={form.client_national_id}
                  onChange={(e) => setForm((f) => ({ ...f, client_national_id: e.target.value }))}
                  placeholder="напр. 8501019999" className={fieldCls} data-testid="bg-national-id" />
              </div>
              <div>
                <label className={lblCls}>Място на подписване</label>
                <input type="text" value={form.place}
                  onChange={(e) => setForm((f) => ({ ...f, place: e.target.value }))}
                  className={fieldCls} data-testid="bg-place" />
              </div>
              <div className="md:col-span-2">
                <label className={lblCls}>Адрес</label>
                <input type="text" value={form.client_address}
                  onChange={(e) => setForm((f) => ({ ...f, client_address: e.target.value }))}
                  placeholder="гр., ул., №, ет., ап." className={fieldCls} data-testid="bg-address" />
              </div>
            </div>
          </div>

          {/* МПС / Приложение №1 */}
          <div>
            <div className="text-[11px] uppercase tracking-wider font-bold text-[#3F3F46] mb-2">2. Параметри на МПС (Приложение №1)</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={lblCls}>Марка</label>
                <input type="text" value={form.vehicle_spec.make} onChange={(e) => setVS('make', e.target.value)} placeholder="Tesla / BMW / …" className={fieldCls} data-testid="bg-make" />
              </div>
              <div>
                <label className={lblCls}>Модел</label>
                <input type="text" value={form.vehicle_spec.model} onChange={(e) => setVS('model', e.target.value)} placeholder="Model 3" className={fieldCls} data-testid="bg-model" />
              </div>
              <div>
                <label className={lblCls}>Година</label>
                <input type="number" min="1990" max="2030" value={form.vehicle_spec.year} onChange={(e) => setVS('year', e.target.value)} placeholder="2022" className={fieldCls} data-testid="bg-year" />
              </div>
              <div className="md:col-span-2">
                <label className={lblCls}>VIN</label>
                <input type="text" maxLength={17} value={form.vehicle_spec.vin} onChange={(e) => setVS('vin', e.target.value.toUpperCase())} placeholder="17 символа" className={`${fieldCls} font-mono`} data-testid="bg-vin" />
              </div>
              <div>
                <label className={lblCls}>Държава</label>
                <select value={form.vehicle_spec.country} onChange={(e) => setVS('country', e.target.value)} className={fieldCls} data-testid="bg-country">
                  <option>САЩ</option>
                  <option>Южна Корея</option>
                  <option>Канада</option>
                  <option>Германия</option>
                  <option>Друго</option>
                </select>
              </div>
              <div>
                <label className={lblCls}>Аукцион / платформа</label>
                <select value={form.vehicle_spec.auction} onChange={(e) => setVS('auction', e.target.value)} className={fieldCls} data-testid="bg-auction">
                  <option value="">—</option>
                  <option>COPART</option>
                  <option>IAAI</option>
                  <option>MANHEIM</option>
                  <option>ENCAR</option>
                  <option>Друго</option>
                </select>
              </div>
              <div>
                <label className={lblCls}>Валута</label>
                <select value={form.vehicle_spec.currency} onChange={(e) => setVS('currency', e.target.value)} className={fieldCls} data-testid="bg-currency">
                  <option>EUR</option>
                  <option>USD</option>
                  <option>BGN</option>
                </select>
              </div>
              <div>
                <label className={lblCls}>Максимална оферта / max bid</label>
                <input type="number" step="100" value={form.vehicle_spec.max_bid} onChange={(e) => setVS('max_bid', e.target.value)} placeholder="28000" className={fieldCls} data-testid="bg-max-bid" />
              </div>
              <div>
                <label className={lblCls}>Общ ориентировъчен бюджет</label>
                <input type="number" step="100" value={form.vehicle_spec.total_budget} onChange={(e) => setVS('total_budget', e.target.value)} placeholder="42000" className={fieldCls} data-testid="bg-total-budget" />
              </div>
            </div>
          </div>

          {/* Финансови условия */}
          <div>
            <div className="text-[11px] uppercase tracking-wider font-bold text-[#3F3F46] mb-2">3. Финансови условия</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className={lblCls}>Депозит %</label>
                <input type="number" min="0" max="100" step="0.5" value={form.financial_terms.deposit_pct} onChange={(e) => setFT('deposit_pct', e.target.value)} className={fieldCls} data-testid="bg-deposit-pct" />
              </div>
              <div>
                <label className={lblCls}>Мин. депозит (EUR)</label>
                <input type="number" min="0" step="50" value={form.financial_terms.deposit_min_eur} onChange={(e) => setFT('deposit_min_eur', e.target.value)} className={fieldCls} data-testid="bg-deposit-min" />
              </div>
              <div>
                <label className={lblCls}>Възнагр. ИЗПЪЛНИТЕЛ (EUR)</label>
                <input type="number" min="0" step="50" value={form.financial_terms.executor_fee_eur} onChange={(e) => setFT('executor_fee_eur', e.target.value)} className={fieldCls} data-testid="bg-executor-fee" />
              </div>
              <div>
                <label className={lblCls}>Срок (дни)</label>
                <input type="number" min="30" max="365" step="1" value={form.financial_terms.duration_days} onChange={(e) => setFT('duration_days', e.target.value)} className={fieldCls} data-testid="bg-duration" />
              </div>
            </div>
            <div className="mt-2 text-[11px] text-[#71717A]">
              Полно обезпечение при платформи: <b>{(form.financial_terms.full_prepay_platforms || []).join(', ') || '—'}</b>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[#E4E4E7] flex items-center justify-end gap-2 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={onClose} className="px-3 h-9 rounded-lg border border-[#E4E4E7] text-sm text-[#52525B] hover:bg-[#FAFAFA]" data-testid="bg-cancel">Отказ</button>
          <button onClick={submit} disabled={submitting || !form.customer_id} className="px-4 h-9 rounded-lg bg-[#18181B] text-white text-sm font-semibold disabled:opacity-50" data-testid="bg-submit">
            {submitting ? 'Запазване…' : 'Създай договор'}
          </button>
        </div>
      </div>
    </div>
  );
};
