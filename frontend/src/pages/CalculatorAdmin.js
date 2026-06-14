/**
 * Calculator Admin Page — Phase 5 (Enhancement #5 + #6)
 *
 * Refactored layout:
 *   • USA / Korea organized as Tabs (mobile-friendly)
 *   • Symmetric structure within each tab:
 *       - Live Preview
 *       - Profile Settings (view + inline edit)
 *       - Sub-sections: Технотест / Мито / Ремонт / Други разходи
 *   • USA-only: technical model editors (USA Inland / Ocean / EU Delivery / Auction Rules)
 *   • RBAC: managers see only Live Preview + read-only profile summary
 *   • i18n: ALL labels go through t(...) → switching to BG/UK stays consistent in edit mode
 *
 * Late Fee / Wire Fee — explicitly NOT profile settings; they live as
 * ad-hoc rows in the per-deal CalculationOverrideEditor (with quick-add presets).
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL, useAuth } from '../App';
import { toast } from 'sonner';
import { useLang } from '../i18n';
import CustomSelect from '../components/ui/CustomSelect';
import RefreshButton from '../components/ui/RefreshButton';
import {
  Gear,
  Calculator,
  Truck,
  Anchor,
  Airplane,
  CurrencyDollar,
  Eye,
  EyeSlash,
  FloppyDisk,
  Trash,
  Plus,
  ChartLine,
  CaretDown,
  CaretUp,
  PencilSimple,
  X,
  Wrench,
  Receipt,
  Info,
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import WhiteSelect from '../components/ui/WhiteSelect';
import UsaInlandModelEditor from '../components/calculator/UsaInlandModelEditor';
import OceanFreightModelEditor from '../components/calculator/OceanFreightModelEditor';
import EuDeliveryModelEditor from '../components/calculator/EuDeliveryModelEditor';

// Roles allowed to edit calculator profile + see technical model editors.
const ADMIN_ROLES = new Set(['admin', 'master_admin', 'owner', 'team_lead']);

const CalculatorAdmin = () => {
  const { t } = useLang();
  const { user } = useAuth() || {};
  const role = (user?.role || '').toLowerCase();
  const isAdmin = ADMIN_ROLES.has(role);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Active region tab
  const [activeTab, setActiveTab] = useState('usa'); // 'usa' | 'korea'

  // Data states
  const [profile, setProfile] = useState(null);
  const [auctionRules, setAuctionRules] = useState([]);
  const [stats, setStats] = useState(null);
  // Korea
  const [koreaProfile, setKoreaProfile] = useState(null);
  const [editedKoreaProfile, setEditedKoreaProfile] = useState(null);
  const [isEditingKorea, setIsEditingKorea] = useState(false);
  const [koreaRoutes, setKoreaRoutes] = useState([]);
  // Catalogs
  const [portsCatalog, setPortsCatalog] = useState([]);
  const [vehicleTypesCatalog, setVehicleTypesCatalog] = useState([]);
  const [auctionsCatalog, setAuctionsCatalog] = useState([]);

  // Collapsible states - all collapsed by default
  const [expandedSections, setExpandedSections] = useState({
    profile: false,
    usaExtras: false, // Технотест/Ремонт/Други
    usaInland: false,
    ocean: false,
    euDelivery: false,
    auctionRules: false,
    koreaProfile: false,
    koreaExtras: false,
    koreaInland: false,
    koreaSea: false,
    koreaBgTransport: false,
  });

  // Profile editing mode
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState(null);

  // Preview state (USA) — Доопр #10: Rotterdam (NL) is the default port.
  const [previewInput, setPreviewInput] = useState({
    price: 15000,
    port: 'rotterdam',
    auction: 'copart',
    vehicleType: 'sedan',
  });
  const [previewResult, setPreviewResult] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Korea preview
  const [koreaPreviewInput, setKoreaPreviewInput] = useState({
    price: 20000,
    invoicePrice: 0,
    additionalFees: 0,
    vehicleType: 'sedan',
    useLogisticsPackage: true,
  });
  const [koreaPreviewResult, setKoreaPreviewResult] = useState(null);
  const [koreaPreviewLoading, setKoreaPreviewLoading] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const toggleSection = (section) =>
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [profileRes, statsRes, optsRes, koreaProfileRes, koreaRoutesRes] = await Promise.all([
        axios.get(`${API_URL}/api/calculator/config/profile`),
        axios.get(`${API_URL}/api/calculator/admin/stats`).catch(() => ({ data: null })),
        axios.get(`${API_URL}/api/calculator/ports`),
        axios
          .get(`${API_URL}/api/calculator/config/profile?code=korea_bg`)
          .catch(() => ({ data: null })),
        axios.get(`${API_URL}/api/calculator/config/routes/korea_bg`).catch(() => ({ data: [] })),
      ]);

      setProfile(profileRes.data);
      setEditedProfile(profileRes.data);
      setStats(statsRes.data || null);

      if (koreaProfileRes?.data) {
        setKoreaProfile(koreaProfileRes.data);
        setEditedKoreaProfile(koreaProfileRes.data);
      }
      if (Array.isArray(koreaRoutesRes?.data)) setKoreaRoutes(koreaRoutesRes.data);

      const opts = optsRes?.data || {};
      setPortsCatalog(Array.isArray(opts.ports) ? opts.ports : []);
      setVehicleTypesCatalog(Array.isArray(opts.vehicleTypes) ? opts.vehicleTypes : []);
      setAuctionsCatalog(Array.isArray(opts.auctions) ? opts.auctions : []);

      if (profileRes.data?.code) {
        const [, rulesRes] = await Promise.all([
          axios.get(`${API_URL}/api/calculator/config/routes/${profileRes.data.code}`),
          axios.get(`${API_URL}/api/calculator/config/auction-fees/${profileRes.data.code}`),
        ]);
        setAuctionRules(rulesRes.data);
      }
    } catch (err) {
      toast.error(t('adm_data_loading_error'));
    } finally {
      setLoading(false);
    }
  };

  const koreaInlandRates = (koreaRoutes || []).filter((r) => r.rateType === 'korea_inland');
  const koreaSeaRates = (koreaRoutes || []).filter((r) => r.rateType === 'korea_sea');
  const koreaBgTransportRates = (koreaRoutes || []).filter((r) => r.rateType === 'korea_bg_transport');

  // ── USA profile edit ─────────────────────────────────────────────────
  const startEditingProfile = () => {
    if (!isAdmin) return;
    setEditedProfile({ ...profile });
    setIsEditingProfile(true);
    setExpandedSections((prev) => ({ ...prev, profile: true }));
  };
  const cancelEditingProfile = () => {
    setEditedProfile(profile);
    setIsEditingProfile(false);
  };
  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await axios.patch(`${API_URL}/api/calculator/config/profile`, editedProfile);
      setProfile(res.data);
      setEditedProfile(res.data);
      setIsEditingProfile(false);
      toast.success(t('adm_profile_saved'));
    } catch (err) {
      toast.error(t('adm_profile_saving_error'));
    } finally {
      setSaving(false);
    }
  };

  // ── Korea profile edit ───────────────────────────────────────────────
  const startEditingKorea = () => {
    if (!isAdmin) return;
    setEditedKoreaProfile({ ...koreaProfile });
    setIsEditingKorea(true);
    setExpandedSections((prev) => ({ ...prev, koreaProfile: true }));
  };
  const cancelEditingKorea = () => {
    setEditedKoreaProfile(koreaProfile);
    setIsEditingKorea(false);
  };
  const saveKoreaProfile = async () => {
    setSaving(true);
    try {
      const res = await axios.patch(`${API_URL}/api/calculator/config/profile`, {
        ...editedKoreaProfile,
        code: 'korea_bg',
      });
      setKoreaProfile(res.data);
      setEditedKoreaProfile(res.data);
      setIsEditingKorea(false);
      toast.success(t('adm_korea_profile_saved'));
    } catch (err) {
      toast.error(t('adm_failed_to_save_korea_profile'));
    } finally {
      setSaving(false);
    }
  };

  // ── Routes (Korea only — USA uses bucket-model editors) ──────────────
  const saveKoreaRoute = async (route) => {
    try {
      const res = await axios.post(`${API_URL}/api/calculator/config/routes`, {
        ...route,
        profileCode: 'korea_bg',
      });
      setKoreaRoutes((prev) => {
        const newId = res.data._id ?? res.data.id;
        const idx = prev.findIndex((r) => (r._id ?? r.id) === newId);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = res.data;
          return clone;
        }
        return [...prev, res.data];
      });
      toast.success(t('adm_korea_rate_saved'));
    } catch (err) {
      toast.error(t('adm_failed_to_save_korea_rate'));
    }
  };
  const deleteKoreaRoute = async (id) => {
    if (!window.confirm(t('adm2_132d19caa7'))) return;
    try {
      await axios.delete(`${API_URL}/api/calculator/config/routes/${id}`);
      setKoreaRoutes((prev) => prev.filter((r) => (r._id ?? r.id) !== id));
      toast.success(t('adm_korea_rate_deleted'));
    } catch (err) {
      toast.error(t('adm_failed_to_delete'));
    }
  };

  // ── Auction rules ────────────────────────────────────────────────────
  const saveAuctionRule = async (rule) => {
    try {
      const res = await axios.post(`${API_URL}/api/calculator/config/auction-fees`, rule);
      setAuctionRules((prev) => {
        const newId = res.data._id ?? res.data.id;
        const idx = prev.findIndex((r) => (r._id ?? r.id) === newId);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = res.data;
          return clone.sort((a, b) => a.minBid - b.minBid);
        }
        return [...prev, res.data].sort((a, b) => a.minBid - b.minBid);
      });
      toast.success(t('adm_rule_saved'));
    } catch (err) {
      toast.error(t('adm_rule_saving_error'));
    }
  };
  const deleteAuctionRule = async (id) => {
    if (!window.confirm(t('adm2_4e3e8cac4a'))) return;
    try {
      await axios.delete(`${API_URL}/api/calculator/config/auction-fees/${id}`);
      setAuctionRules((prev) => prev.filter((r) => (r._id ?? r.id) !== id));
      toast.success(t('adm_rule_deleted'));
    } catch (err) {
      toast.error(t('adm_deletion_error'));
    }
  };

  // ── Run previews ─────────────────────────────────────────────────────
  const runPreview = async () => {
    setPreviewLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/calculator/calculate`, previewInput);
      setPreviewResult(res.data);
    } catch (err) {
      toast.error(t('adm_calculation_error'));
    } finally {
      setPreviewLoading(false);
    }
  };
  const runKoreaPreview = async () => {
    setKoreaPreviewLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/calculator/calculate`, {
        origin: 'korea',
        ...koreaPreviewInput,
      });
      setKoreaPreviewResult(res.data);
    } catch (err) {
      toast.error(t('adm_korea_calculation_failed'));
    } finally {
      setKoreaPreviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#18181B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#71717A]">{t('adm_loading_2')}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      data-testid="calculator-admin-page"
    >
      {/* Header */}
      <div className="flex flex-row items-start justify-between gap-3 sm:gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[#18181B] text-white flex items-center justify-center shrink-0">
            <Calculator size={20} weight="bold" />
          </div>
          <div className="flex-1 min-w-0">
            <h1
              className="text-xl sm:text-2xl font-bold tracking-tight text-[#18181B] leading-tight break-words"
              style={{ fontFamily: 'Mazzard, Mazzard H, Mazzard M, system-ui, sans-serif' }}
            >
              {t('adm_calculator_settings')}
            </h1>
            <p className="text-xs sm:text-sm text-[#71717A] mt-1 break-words">
              {t('adm_bid_commission_and_hidden_fee_management')}
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <RefreshButton onClick={loadAllData} ariaLabel={t('adm_refresh_3')} testId="refresh-btn" />
        </div>
      </div>

      {/* Stats - compact (Admin only) */}
      {stats && isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <StatCard
            icon={ChartLine}
            label={t('adm_calculations')}
            value={Number(stats.totalQuotes ?? stats.quotes ?? 0)}
            compact
          />
          <StatCard
            icon={CurrencyDollar}
            label={t('adm_amount')}
            value={(() => {
              const v = Number(stats.totalQuotedValue ?? 0);
              if (!isFinite(v) || v === 0) return '$0';
              if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
              return `$${v.toFixed(0)}`;
            })()}
            compact
          />
          <StatCard
            icon={Gear}
            label={t('adm_profiles')}
            value={Number(stats.profiles ?? stats.profileActive ?? 0)}
            compact
          />
          <StatCard
            icon={Calculator}
            label={t('adm_active_3')}
            value={stats.activeProfile || 'Standard'}
            compact
          />
        </div>
      )}

      {/* Manager restricted banner */}
      {!isAdmin && (
        <div
          className="card p-4 flex items-start gap-3 bg-[#FEF9C3] border-[#FACC15]"
          data-testid="manager-restricted-banner"
        >
          <div className="p-2 bg-[#CA8A04] rounded-lg text-white shrink-0">
            <Info size={18} weight="bold" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-[#18181B] text-sm">
              {t('cal_manager_restricted_title')}
            </h3>
            <p className="text-xs text-[#71717A] mt-1">{t('cal_manager_restricted_subtitle')}</p>
          </div>
        </div>
      )}

      {/* ═══════════════════ REGION TABS (USA / Korea) ═══════════════════ */}
      <div className="card p-1 inline-flex gap-1 w-full sm:w-auto" data-testid="region-tabs">
        <TabBtn
          active={activeTab === 'usa'}
          onClick={() => setActiveTab('usa')}
          label={t('cal_tab_usa')}
          subtitle={t('cal_pipeline_usa')}
          testId="tab-usa"
        />
        <TabBtn
          active={activeTab === 'korea'}
          onClick={() => setActiveTab('korea')}
          label={t('cal_tab_korea')}
          subtitle={t('cal_pipeline_korea')}
          testId="tab-korea"
        />
      </div>

      {/* ═════════════════════════ USA TAB ═════════════════════════════ */}
      {activeTab === 'usa' && (
        <div className="space-y-4" data-testid="usa-tab-content">
          {/* USA Live Preview */}
          <div
            className="card p-4 space-y-4 bg-gradient-to-r from-[#F0FDF4] to-[#ECFDF5] border-[#86EFAC]"
            data-testid="preview-section"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#059669] rounded-lg">
                <Eye size={20} className="text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-[#18181B]">{t('cal_preview_usa_label')}</h2>
                <p className="text-xs text-[#71717A]">{t('adm_test_calculation_with_current_settings')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <NumberField
                label={t('cal_field_vehicle_price')}
                value={previewInput.price}
                onChange={(v) => setPreviewInput({ ...previewInput, price: v })}
              />
              <CustomSelect
                label={t('adm_port')}
                value={previewInput.port}
                onChange={(val) => setPreviewInput({ ...previewInput, port: val })}
                options={(portsCatalog.length
                  ? portsCatalog
                  : [{ code: 'rotterdam', name: 'Rotterdam', country: 'NL' }]
                ).map((p) => ({
                  value: p.code || p.id,
                  label: `${p.name}${p.country ? ` (${p.country})` : ''}`,
                }))}
                testId="preview-port"
              />
              <CustomSelect
                label={t('adm_auction_2')}
                value={previewInput.auction}
                onChange={(val) => setPreviewInput({ ...previewInput, auction: val })}
                options={(auctionsCatalog.length
                  ? auctionsCatalog
                  : [{ code: 'copart', name: t('adm_copart') }, { code: 'iaai', name: 'IAAI' }]
                ).map((a) => ({ value: a.code, label: a.name }))}
                testId="preview-auction"
              />
              <CustomSelect
                label={t('adm_car_type')}
                value={previewInput.vehicleType}
                onChange={(val) => setPreviewInput({ ...previewInput, vehicleType: val })}
                options={(vehicleTypesCatalog.length
                  ? vehicleTypesCatalog
                  : [{ code: 'sedan', name: t('adm_sedan') }]
                ).map((v) => ({ value: v.code, label: v.name }))}
                testId="preview-vehicle-type"
              />
              <div className="flex items-end">
                <button
                  onClick={runPreview}
                  disabled={previewLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                  data-testid="run-preview-btn"
                >
                  <Calculator size={18} />
                  {previewLoading ? t('cal_preview_running') : t('cal_preview_run')}
                </button>
              </div>
            </div>

            {previewResult && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3 border-t border-[#86EFAC]">
                <div className="bg-white border border-[#E4E4E7] rounded-xl p-3">
                  <h3 className="font-semibold text-[#18181B] mb-2 flex items-center gap-2 text-sm">
                    <Eye size={14} />
                    {t('adm_client_view')}
                  </h3>
                  <div className="space-y-1 text-sm max-h-[220px] overflow-y-auto">
                    {(previewResult.formattedBreakdown || previewResult.calculation?.breakdown || []).map(
                      (item, i) => (
                        <div
                          key={i}
                          className="flex justify-between py-0.5 border-b border-[#F4F4F5]"
                        >
                          <span className="text-[#71717A] text-xs">{item.label}</span>
                          <span className="font-medium text-xs">
                            ${Number(item.value || 0).toLocaleString()}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                  <div className="mt-2 pt-2 border-t-2 border-[#18181B] flex justify-between items-center">
                    <span className="font-semibold text-sm">{t('adm_customer_sees')}</span>
                    <span
                      className="font-bold text-lg text-[#059669]"
                      data-testid="preview-visible-total"
                    >
                      ${Number(previewResult.totals?.visible ?? previewResult.calculation?.total ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="bg-[#F5F3FF] border border-[#7C3AED] rounded-xl p-3">
                    <h3 className="font-semibold text-[#18181B] mb-2 flex items-center gap-2 text-sm">
                      <EyeSlash size={14} className="text-[#7C3AED]" />
                      {t('adm_manager_view')}
                    </h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between py-0.5">
                        <span className="text-[#71717A] text-xs">{t('adm_vehicle_price')}</span>
                        <span className="font-medium text-xs">
                          ${Number(previewResult.calculation?.vehiclePrice || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-[#71717A] text-xs">{t('adm_auction_total')}</span>
                        <span className="font-medium text-xs">
                          ${Number(previewResult.calculation?.auctionTotal || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-[#71717A] text-xs">{t('adm_delivery_total')}</span>
                        <span className="font-medium text-xs">
                          ${Number(previewResult.calculation?.deliveryTotal || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-[#71717A] text-xs">{t('adm_hidden_fee')}</span>
                        <span className="font-medium text-[#7C3AED] text-xs">
                          +${Number(previewResult.hiddenBreakdown?.hiddenFee || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t-2 border-[#7C3AED] flex justify-between items-center">
                      <span className="font-semibold text-sm">{t('adm_manager')}</span>
                      <span
                        className="font-bold text-lg text-[#7C3AED]"
                        data-testid="preview-internal-total"
                      >
                        ${Number(
                          previewResult.totals?.internal ?? previewResult.calculation?.total ?? 0
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Доопр #21 — Auto-generate contract from this calculation */}
                <GenerateContractButton previewResult={previewResult} previewInput={previewInput} t={t} />
              </div>
            )}
          </div>

          {/* USA Profile Settings */}
          {profile && (
            <CollapsibleSection
              title={t('adm_profile_settings')}
              subtitle={`${profile.name} • ${profile.destinationCountry}`}
              icon={Gear}
              isExpanded={expandedSections.profile}
              onToggle={() => toggleSection('profile')}
              headerAction={
                isAdmin && !isEditingProfile && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditingProfile();
                    }}
                    className="p-2 hover:bg-[#F4F4F5] rounded-lg transition-colors"
                    title={t('adm_edit_2')}
                    data-testid="edit-profile-btn"
                  >
                    <PencilSimple size={16} className="text-[#71717A]" />
                  </button>
                )
              }
            >
              {isAdmin && isEditingProfile ? (
                <UsaProfileEditForm
                  editedProfile={editedProfile}
                  setEditedProfile={setEditedProfile}
                  saveProfile={saveProfile}
                  cancelEditingProfile={cancelEditingProfile}
                  saving={saving}
                  t={t}
                />
              ) : (
                <UsaProfileView profile={profile} t={t} />
              )}
            </CollapsibleSection>
          )}

          {/* USA — Технотест / Ремонт / Други (additive profile fields) */}
          {profile && (
            <CollapsibleSection
              title={`${t('cal_section_technotest')} • ${t('cal_section_repair')} • ${t('cal_section_other_expenses')}`}
              subtitle={t('cal_quick_add_hint')}
              icon={Wrench}
              isExpanded={expandedSections.usaExtras}
              onToggle={() => toggleSection('usaExtras')}
            >
              <ExtrasSection
                profile={profile}
                editedProfile={editedProfile}
                setEditedProfile={setEditedProfile}
                isAdmin={isAdmin}
                onSave={async (patch) => {
                  setSaving(true);
                  try {
                    const res = await axios.patch(
                      `${API_URL}/api/calculator/config/profile`,
                      { ...profile, ...patch }
                    );
                    setProfile(res.data);
                    setEditedProfile(res.data);
                    toast.success(t('adm_profile_saved'));
                  } catch {
                    toast.error(t('adm_profile_saving_error'));
                  } finally {
                    setSaving(false);
                  }
                }}
                saving={saving}
                t={t}
                testIdPrefix="usa-extras"
              />
            </CollapsibleSection>
          )}

          {/* USA Inland — Admin only */}
          {isAdmin && (
            <CollapsibleSection
              title={t('adm_usa_inland_delivery')}
              subtitle={
                profile?.usaInlandModel?.enabled === false
                  ? 'Bucket model OFF · legacy routes'
                  : 'Bucket model · state → port × multiplier'
              }
              icon={Truck}
              isExpanded={expandedSections.usaInland}
              onToggle={() => toggleSection('usaInland')}
            >
              <UsaInlandModelEditor
                profile={profile}
                onProfileChange={(p) => {
                  setProfile(p);
                  setEditedProfile(p);
                }}
              />
            </CollapsibleSection>
          )}

          {/* Ocean Freight — Admin only */}
          {isAdmin && (
            <CollapsibleSection
              title={t('adm_ocean_freight')}
              subtitle={
                profile?.oceanFreightModel?.enabled === false
                  ? 'Bucket model OFF · legacy routes'
                  : 'Bucket model · export port → lane × multiplier'
              }
              icon={Anchor}
              isExpanded={expandedSections.ocean}
              onToggle={() => toggleSection('ocean')}
            >
              <OceanFreightModelEditor
                profile={profile}
                onProfileChange={(p) => {
                  setProfile(p);
                  setEditedProfile(p);
                }}
              />
            </CollapsibleSection>
          )}

          {/* EU Delivery — Admin only */}
          {isAdmin && (
            <CollapsibleSection
              title={t('adm_eu_delivery')}
              subtitle={
                profile?.euDeliveryModel?.enabled === false
                  ? 'Matrix OFF · legacy routes'
                  : 'Matrix · EU port → Sofia (BG) per vehicle (EUR)'
              }
              icon={Airplane}
              isExpanded={expandedSections.euDelivery}
              onToggle={() => toggleSection('euDelivery')}
            >
              <EuDeliveryModelEditor
                profile={profile}
                onProfileChange={(p) => {
                  setProfile(p);
                  setEditedProfile(p);
                }}
              />
            </CollapsibleSection>
          )}

          {/* Auction fee rules — Admin only */}
          {isAdmin && (
            <CollapsibleSection
              title={t('adm_auction_fee_rules')}
              subtitle={`${auctionRules.length} ${t('adm3_rules_count')}`}
              icon={CurrencyDollar}
              isExpanded={expandedSections.auctionRules}
              onToggle={() => toggleSection('auctionRules')}
            >
              <div className="overflow-x-auto">
                <table className="table-premium w-full min-w-[400px]" data-testid="auction-rules-table">
                  <thead>
                    <tr>
                      <th>Min ($)</th>
                      <th>Max ($)</th>
                      <th>Fee ($)</th>
                      <th className="text-right">{t('adm_actions_2')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auctionRules.map((rule) => (
                      <AuctionRuleRow
                        key={rule._id ?? rule.id}
                        rule={rule}
                        profileCode={profile?.code}
                        onSave={saveAuctionRule}
                        onDelete={deleteAuctionRule}
                      />
                    ))}
                    <NewAuctionRuleRow profileCode={profile?.code} onSave={saveAuctionRule} />
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}
        </div>
      )}

      {/* ═════════════════════════ KOREA TAB ═════════════════════════════ */}
      {activeTab === 'korea' && (
        <div className="space-y-4" data-testid="korea-tab-content">
          {/* Korea Live Preview */}
          <div
            className="card p-4 space-y-4 bg-gradient-to-r from-[#FEF3C7] to-[#FEE2E2] border-[#FBBF24]"
            data-testid="korea-preview-section"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#D97706] rounded-lg">
                <Eye size={20} className="text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-[#18181B]">{t('cal_preview_korea_label')}</h2>
                <p className="text-xs text-[#71717A]">{t('adm_korea_romania_bulgaria_pipeline')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <NumberField
                label={t('cal_field_vehicle_price')}
                value={koreaPreviewInput.price}
                onChange={(v) => setKoreaPreviewInput({ ...koreaPreviewInput, price: v })}
              />
              <NumberField
                label={t('cal_field_invoice_price')}
                value={koreaPreviewInput.invoicePrice}
                onChange={(v) => setKoreaPreviewInput({ ...koreaPreviewInput, invoicePrice: v })}
              />
              <NumberField
                label={t('cal_field_additional_fees_eur')}
                value={koreaPreviewInput.additionalFees}
                onChange={(v) => setKoreaPreviewInput({ ...koreaPreviewInput, additionalFees: v })}
              />
              <CustomSelect
                label={t('adm_vehicle_type')}
                value={koreaPreviewInput.vehicleType}
                onChange={(val) => setKoreaPreviewInput({ ...koreaPreviewInput, vehicleType: val })}
                options={(vehicleTypesCatalog.length
                  ? vehicleTypesCatalog
                  : [{ code: 'sedan', name: t('adm_sedan') }]
                ).map((v) => ({ value: v.code, label: v.name }))}
                testId="korea-preview-vehicle-type"
              />
              <CustomSelect
                label={t('adm_logistics')}
                value={koreaPreviewInput.useLogisticsPackage ? 'package' : 'itemized'}
                onChange={(val) =>
                  setKoreaPreviewInput({
                    ...koreaPreviewInput,
                    useLogisticsPackage: val === 'package',
                  })
                }
                options={[
                  { value: 'package', label: t('cal_logistics_package_label') },
                  { value: 'itemized', label: t('cal_logistics_itemized') },
                ]}
                testId="korea-preview-logistics-mode"
              />
              <div className="flex items-end">
                <button
                  onClick={runKoreaPreview}
                  disabled={koreaPreviewLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                  data-testid="run-korea-preview-btn"
                >
                  <Calculator size={18} />
                  {koreaPreviewLoading ? t('cal_preview_running') : t('cal_preview_run')}
                </button>
              </div>
            </div>

            {koreaPreviewResult && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3 border-t border-[#FBBF24]">
                <div className="bg-white border border-[#E4E4E7] rounded-xl p-3">
                  <h3 className="font-semibold text-[#18181B] mb-2 flex items-center gap-2 text-sm">
                    <Eye size={14} /> {t('adm_breakdown')}
                  </h3>
                  <div className="space-y-1 text-sm max-h-[260px] overflow-y-auto">
                    {(koreaPreviewResult.calculation?.breakdown || []).map((item, i) => (
                      <div
                        key={i}
                        className="flex justify-between py-0.5 border-b border-[#F4F4F5]"
                      >
                        <span className="text-[#71717A] text-xs">{item.label}</span>
                        <span className="font-medium text-xs">
                          ${Number(item.value || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t-2 border-[#18181B] flex justify-between items-center">
                    <span className="font-semibold text-sm">{t('adm_final_total_2')}</span>
                    <span
                      className="font-bold text-lg text-[#D97706]"
                      data-testid="korea-preview-total"
                    >
                      ${Number(koreaPreviewResult.calculation?.total ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="bg-[#FFF7ED] border border-[#F59E0B] rounded-xl p-3">
                  <h3 className="font-semibold text-[#18181B] mb-2 text-sm">
                    {t('adm_calculation_blocks')}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between p-2 bg-white rounded-lg">
                      <span className="text-[#71717A]">Calc 1 (Price + 5% auction)</span>
                      <span className="font-bold">
                        ${Number(koreaPreviewResult.calculation?.calc1Total ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-white rounded-lg">
                      <span className="text-[#71717A]">Calc 2 (Logistics)</span>
                      <span className="font-bold">
                        ${Number(koreaPreviewResult.calculation?.calc2Total ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-white rounded-lg">
                      <span className="text-[#71717A]">Calc 3 (Customs + VAT + fees)</span>
                      <span className="font-bold">
                        ${Number(koreaPreviewResult.calculation?.calc3Total ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-[#D97706] text-white rounded-lg">
                      <span className="font-semibold">{t('adm_final_total')}</span>
                      <span className="font-bold">
                        ${Number(koreaPreviewResult.calculation?.total ?? 0).toLocaleString()}{' '}
                        ({Number(koreaPreviewResult.calculation?.totalEur ?? 0).toLocaleString()}€)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Korea Profile */}
          {koreaProfile && (
            <CollapsibleSection
              title={t('adm_korea_profile_settings')}
              subtitle={`${koreaProfile.name} • Origin: KR → BG`}
              icon={Gear}
              isExpanded={expandedSections.koreaProfile}
              onToggle={() => toggleSection('koreaProfile')}
              headerAction={
                isAdmin && !isEditingKorea && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditingKorea();
                    }}
                    className="p-2 hover:bg-[#F4F4F5] rounded-lg transition-colors"
                    title={t('adm_edit')}
                    data-testid="edit-korea-profile-btn"
                  >
                    <PencilSimple size={16} className="text-[#71717A]" />
                  </button>
                )
              }
            >
              {isAdmin && isEditingKorea ? (
                <KoreaProfileEditForm
                  editedKoreaProfile={editedKoreaProfile}
                  setEditedKoreaProfile={setEditedKoreaProfile}
                  saveKoreaProfile={saveKoreaProfile}
                  cancelEditingKorea={cancelEditingKorea}
                  saving={saving}
                  t={t}
                />
              ) : (
                <KoreaProfileView koreaProfile={koreaProfile} t={t} />
              )}
            </CollapsibleSection>
          )}

          {/* Korea — Технотест / Ремонт / Други */}
          {koreaProfile && (
            <CollapsibleSection
              title={`${t('cal_section_technotest')} • ${t('cal_section_repair')} • ${t('cal_section_other_expenses')}`}
              subtitle={t('cal_quick_add_hint')}
              icon={Wrench}
              isExpanded={expandedSections.koreaExtras}
              onToggle={() => toggleSection('koreaExtras')}
            >
              <ExtrasSection
                profile={koreaProfile}
                editedProfile={editedKoreaProfile}
                setEditedProfile={setEditedKoreaProfile}
                isAdmin={isAdmin}
                onSave={async (patch) => {
                  setSaving(true);
                  try {
                    const res = await axios.patch(`${API_URL}/api/calculator/config/profile`, {
                      ...koreaProfile,
                      ...patch,
                      code: 'korea_bg',
                    });
                    setKoreaProfile(res.data);
                    setEditedKoreaProfile(res.data);
                    toast.success(t('adm_korea_profile_saved'));
                  } catch {
                    toast.error(t('adm_failed_to_save_korea_profile'));
                  } finally {
                    setSaving(false);
                  }
                }}
                saving={saving}
                t={t}
                isKorea
                testIdPrefix="korea-extras"
              />
            </CollapsibleSection>
          )}

          {/* Korea route tables — Admin only */}
          {isAdmin && (
            <>
              <CollapsibleSection
                title={t('adm_korea_inland_transport')}
                subtitle={`${koreaInlandRates.length} rates (per vehicle type)`}
                icon={Truck}
                isExpanded={expandedSections.koreaInland}
                onToggle={() => toggleSection('koreaInland')}
              >
                <RateSectionContent
                  rates={koreaInlandRates}
                  profileCode={'korea_bg'}
                  rateType="korea_inland"
                  onSave={saveKoreaRoute}
                  onDelete={deleteKoreaRoute}
                  locationField="originCode"
                  vehicleTypesCatalog={vehicleTypesCatalog}
                />
              </CollapsibleSection>

              <CollapsibleSection
                title={t('adm_korea_romania_sea_shipping')}
                subtitle={`${koreaSeaRates.length} rates`}
                icon={Anchor}
                isExpanded={expandedSections.koreaSea}
                onToggle={() => toggleSection('koreaSea')}
              >
                <RateSectionContent
                  rates={koreaSeaRates}
                  profileCode={'korea_bg'}
                  rateType="korea_sea"
                  onSave={saveKoreaRoute}
                  onDelete={deleteKoreaRoute}
                  locationField="destinationCode"
                  vehicleTypesCatalog={vehicleTypesCatalog}
                />
              </CollapsibleSection>

              <CollapsibleSection
                title={t('adm_romania_bulgaria_transport')}
                subtitle={`${koreaBgTransportRates.length} rates (EUR)`}
                icon={Airplane}
                isExpanded={expandedSections.koreaBgTransport}
                onToggle={() => toggleSection('koreaBgTransport')}
              >
                <RateSectionContent
                  rates={koreaBgTransportRates}
                  profileCode={'korea_bg'}
                  rateType="korea_bg_transport"
                  onSave={saveKoreaRoute}
                  onDelete={deleteKoreaRoute}
                  locationField="destinationCode"
                  vehicleTypesCatalog={vehicleTypesCatalog}
                />
              </CollapsibleSection>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
};

// ════════════════════════════════════════════════════════════════════════
// TAB BUTTON
// ════════════════════════════════════════════════════════════════════════
const TabBtn = ({ active, onClick, label, subtitle, testId }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex-1 px-4 py-3 rounded-lg text-left transition-colors ${
      active ? 'bg-[#18181B] text-white' : 'hover:bg-[#F4F4F5] text-[#18181B]'
    }`}
    data-testid={testId}
  >
    <div className="font-semibold text-sm">{label}</div>
    <div className={`text-xs ${active ? 'text-white/80' : 'text-[#71717A]'} mt-0.5`}>{subtitle}</div>
  </button>
);

// ════════════════════════════════════════════════════════════════════════
// USA PROFILE — EDIT / VIEW
// ════════════════════════════════════════════════════════════════════════
const UsaProfileEditForm = ({
  editedProfile,
  setEditedProfile,
  saveProfile,
  cancelEditingProfile,
  saving,
  t,
}) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      <InputField
        label={t('cal_field_profile_name')}
        value={editedProfile?.name || ''}
        onChange={(v) => setEditedProfile({ ...editedProfile, name: v })}
      />
      <InputField
        label={t('cal_field_country')}
        value={editedProfile?.destinationCountry || ''}
        onChange={(v) => setEditedProfile({ ...editedProfile, destinationCountry: v })}
      />
      <InputField
        label={t('cal_field_currency')}
        value={editedProfile?.currency || ''}
        onChange={(v) => setEditedProfile({ ...editedProfile, currency: v })}
      />
      <NumberField
        label={t('cal_field_insurance_rate')}
        value={Number((editedProfile?.insuranceRate || 0) * 100)}
        onChange={(v) =>
          setEditedProfile({ ...editedProfile, insuranceRate: (Number(v) || 0) / 100 })
        }
      />
      <NumberField
        label={t('cal_field_customs_duty_rate')}
        value={Number((editedProfile?.customsDutyRate || 0) * 100)}
        onChange={(v) =>
          setEditedProfile({ ...editedProfile, customsDutyRate: (Number(v) || 0) / 100 })
        }
      />
      <NumberField
        label={t('cal_field_port_forwarding')}
        value={Number(editedProfile?.portForwarding || 0)}
        onChange={(v) => setEditedProfile({ ...editedProfile, portForwarding: Number(v) || 0 })}
      />
      <NumberField
        label={t('cal_field_port_parking')}
        value={Number(editedProfile?.portParking || 0)}
        onChange={(v) => setEditedProfile({ ...editedProfile, portParking: Number(v) || 0 })}
      />
      <NumberField
        label={t('cal_field_parking_bulgaria')}
        value={Number(editedProfile?.parkingBulgaria || 0)}
        onChange={(v) => setEditedProfile({ ...editedProfile, parkingBulgaria: Number(v) || 0 })}
      />
      <NumberField
        label={t('cal_field_company_services')}
        value={Number(editedProfile?.companyServices || 0)}
        onChange={(v) => setEditedProfile({ ...editedProfile, companyServices: Number(v) || 0 })}
      />
      <NumberField
        label={t('cal_field_customs_documentation')}
        value={Number(editedProfile?.customsDocumentation || 0)}
        onChange={(v) =>
          setEditedProfile({ ...editedProfile, customsDocumentation: Number(v) || 0 })
        }
      />
      <NumberField
        label={t('cal_field_damaged_customs_factor')}
        value={Number(editedProfile?.damagedCustomsFactor ?? 0.7)}
        step={0.01}
        onChange={(v) =>
          setEditedProfile({ ...editedProfile, damagedCustomsFactor: Number(v) || 0 })
        }
      />
      <NumberField
        label={t('cal_field_damage_handling_fee')}
        value={Number(editedProfile?.damageHandlingFeeUsd ?? 200)}
        onChange={(v) =>
          setEditedProfile({ ...editedProfile, damageHandlingFeeUsd: Number(v) || 0 })
        }
      />
      <NumberField
        label={t('cal_field_official_fees')}
        value={Number(editedProfile?.officialFees || 0)}
        onChange={(v) => setEditedProfile({ ...editedProfile, officialFees: Number(v) || 0 })}
      />
    </div>

    {/* Per-auction fees */}
    <div className="pt-3 border-t border-[#E4E4E7]">
      <h3 className="font-medium text-[#18181B] mb-3 flex items-center gap-2 text-sm">
        <CurrencyDollar size={16} className="text-[#D97706]" />
        {t('cal_section_auction_fees')}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {['copart', 'iaai'].map((auc) => {
          const af = (editedProfile?.auctionFees || {})[auc] || {};
          const setField = (field, v) => {
            const next = { ...(editedProfile?.auctionFees || {}) };
            next[auc] = { ...(next[auc] || {}), [field]: Number(v) || 0 };
            setEditedProfile({ ...editedProfile, auctionFees: next });
          };
          return (
            <React.Fragment key={auc}>
              <NumberField
                label={`${auc.toUpperCase()} ${t('cal_field_auction_buyer_pct')}`}
                value={Number(af.buyer_fee_percent || 0)}
                onChange={(v) => setField('buyer_fee_percent', v)}
              />
              <NumberField
                label={`${auc.toUpperCase()} ${t('cal_field_auction_gate')}`}
                value={Number(af.gate_fee || 0)}
                onChange={(v) => setField('gate_fee', v)}
              />
              <NumberField
                label={`${auc.toUpperCase()} ${t('cal_field_auction_title')}`}
                value={Number(af.title_fee || 0)}
                onChange={(v) => setField('title_fee', v)}
              />
            </React.Fragment>
          );
        })}
      </div>
    </div>

    <div className="flex gap-2 pt-2">
      <button
        onClick={saveProfile}
        disabled={saving}
        className="btn-primary flex items-center gap-2"
        data-testid="save-profile-btn"
      >
        <FloppyDisk size={16} />
        {saving ? t('adm2_034bf16d6c') : t('adm2_79d9f1b64d')}
      </button>
      <button
        onClick={cancelEditingProfile}
        className="px-4 py-2 border border-[#E4E4E7] rounded-xl hover:bg-[#F4F4F5] flex items-center gap-2"
        data-testid="cancel-profile-btn"
      >
        <X size={16} />
        {t('adm_cancel_3')}
      </button>
    </div>
  </div>
);

const UsaProfileView = ({ profile, t }) => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      <ViewField label={t('adm_name_2')} value={profile.name || '—'} />
      <ViewField label={t('cal_field_country')} value={profile.destinationCountry || '—'} />
      <ViewField label={t('cal_field_currency')} value={profile.currency || 'USD'} />
      <ViewField
        label={t('adm_insurance')}
        value={`${((profile.insuranceRate || 0) * 100).toFixed(2)}%`}
      />
      <ViewField
        label={t('adm_customs_duty')}
        value={`${((profile.customsDutyRate || 0) * 100).toFixed(2)}%`}
      />
      <ViewField
        label={t('adm_port_forwarding')}
        value={`$${Number(profile.portForwarding || 0).toLocaleString()}`}
      />
      <ViewField
        label={t('adm_port_parking')}
        value={`$${Number(profile.portParking || 0).toLocaleString()}`}
      />
      <ViewField
        label={t('adm_parking_bg')}
        value={`$${Number(profile.parkingBulgaria || 0).toLocaleString()}`}
      />
      <ViewField
        label={t('adm_company_services')}
        value={`$${Number(profile.companyServices || 0).toLocaleString()}`}
      />
      <ViewField
        label={t('adm_customs_docs')}
        value={`$${Number(profile.customsDocumentation || 0).toLocaleString()}`}
      />
      <ViewField
        label={t('adm_damaged_factor')}
        value={`×${Number(profile.damagedCustomsFactor ?? 0.7).toFixed(2)}`}
      />
      <ViewField
        label={t('adm_damage_handling')}
        value={`$${Number(profile.damageHandlingFeeUsd ?? 200).toLocaleString()}`}
      />
      <ViewField
        label={t('adm_official_fees')}
        value={`$${Number(profile.officialFees || 0).toLocaleString()}`}
      />
      <ViewField
        label={t('adm_copart_title')}
        value={`$${Number(((profile.auctionFees || {}).copart || {}).title_fee || 0).toLocaleString()}`}
      />
      <ViewField
        label={t('adm_iaai_title')}
        value={`$${Number(((profile.auctionFees || {}).iaai || {}).title_fee || 0).toLocaleString()}`}
      />
    </div>
    <div className="pt-2 border-t border-[#E4E4E7]">
      <p className="text-xs text-[#71717A] mb-2">Buyer Fee Tiers (auction):</p>
      <div className="flex gap-4 flex-wrap text-sm">
        <span>
          {t('adm_copart_2')}{' '}
          <strong>{((profile.auctionFees || {}).copart || {}).buyer_fee_percent || 0}%</strong>
        </span>
        <span>
          {t('adm_iaai')}{' '}
          <strong>{((profile.auctionFees || {}).iaai || {}).buyer_fee_percent || 0}%</strong>
        </span>
      </div>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════════════
// KOREA PROFILE — EDIT / VIEW
// ════════════════════════════════════════════════════════════════════════
const KoreaProfileEditForm = ({
  editedKoreaProfile,
  setEditedKoreaProfile,
  saveKoreaProfile,
  cancelEditingKorea,
  saving,
  t,
}) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      <NumberField
        label={t('cal_field_auction_fee_pct')}
        value={Number(editedKoreaProfile?.auctionFeePercent || 0)}
        onChange={(v) =>
          setEditedKoreaProfile({ ...editedKoreaProfile, auctionFeePercent: Number(v) || 0 })
        }
      />
      <NumberField
        label={t('cal_field_logistics_package')}
        value={Number(editedKoreaProfile?.logisticsPackage || 0)}
        onChange={(v) =>
          setEditedKoreaProfile({ ...editedKoreaProfile, logisticsPackage: Number(v) || 0 })
        }
      />
      <div>
        <label className="block text-xs font-medium text-[#71717A] uppercase tracking-wider mb-1">
          {t('adm_use_package')}
        </label>
        <WhiteSelect
          value={editedKoreaProfile?.useLogisticsPackage ? 'true' : 'false'}
          onChange={(e) =>
            setEditedKoreaProfile({
              ...editedKoreaProfile,
              useLogisticsPackage: e.target.value === 'true',
            })
          }
          className="input"
        >
          <option value="true">{t('cal_logistics_package_label')}</option>
          <option value="false">{t('cal_logistics_itemized')}</option>
        </WhiteSelect>
      </div>
      <NumberField
        label={t('cal_field_korea_inland')}
        value={Number(editedKoreaProfile?.koreaInlandTransport || 0)}
        onChange={(v) =>
          setEditedKoreaProfile({ ...editedKoreaProfile, koreaInlandTransport: Number(v) || 0 })
        }
      />
      <NumberField
        label={t('cal_field_sea_shipping')}
        value={Number(editedKoreaProfile?.seaShipping || 0)}
        onChange={(v) =>
          setEditedKoreaProfile({ ...editedKoreaProfile, seaShipping: Number(v) || 0 })
        }
      />
      <NumberField
        label={t('cal_field_insurance_usd')}
        value={Number(editedKoreaProfile?.insurance || 0)}
        onChange={(v) =>
          setEditedKoreaProfile({ ...editedKoreaProfile, insurance: Number(v) || 0 })
        }
      />
      <NumberField
        label={t('cal_field_forwarder_fee')}
        value={Number(editedKoreaProfile?.forwarderFee || 0)}
        onChange={(v) =>
          setEditedKoreaProfile({ ...editedKoreaProfile, forwarderFee: Number(v) || 0 })
        }
      />
      <NumberField
        label={t('cal_field_documents_mail')}
        value={Number(editedKoreaProfile?.documentsMailFee || 0)}
        onChange={(v) =>
          setEditedKoreaProfile({ ...editedKoreaProfile, documentsMailFee: Number(v) || 0 })
        }
      />
      <NumberField
        label={t('cal_field_customs_duty_rate')}
        value={Number((editedKoreaProfile?.customsDutyRate || 0) * 100)}
        onChange={(v) =>
          setEditedKoreaProfile({
            ...editedKoreaProfile,
            customsDutyRate: (Number(v) || 0) / 100,
          })
        }
      />
      <NumberField
        label={t('cal_field_vat')}
        value={Number((editedKoreaProfile?.vatRate || 0) * 100)}
        onChange={(v) =>
          setEditedKoreaProfile({ ...editedKoreaProfile, vatRate: (Number(v) || 0) / 100 })
        }
      />
      <NumberField
        label={t('cal_field_undervalue')}
        value={Number((editedKoreaProfile?.undervaluePercent || 0) * 100)}
        onChange={(v) =>
          setEditedKoreaProfile({
            ...editedKoreaProfile,
            undervaluePercent: (Number(v) || 0) / 100,
          })
        }
      />
      <NumberField
        label={t('cal_field_fx_usd_eur')}
        value={Number(editedKoreaProfile?.fxUsdToEur || 0)}
        onChange={(v) =>
          setEditedKoreaProfile({ ...editedKoreaProfile, fxUsdToEur: Number(v) || 0 })
        }
      />
      <NumberField
        label={t('cal_field_bibi_service_fee')}
        value={Number(editedKoreaProfile?.bibiServiceFee || 0)}
        onChange={(v) =>
          setEditedKoreaProfile({ ...editedKoreaProfile, bibiServiceFee: Number(v) || 0 })
        }
      />
      <NumberField
        label={t('cal_field_bg_transport_eur')}
        value={Number(editedKoreaProfile?.bgTransportEur || 0)}
        onChange={(v) =>
          setEditedKoreaProfile({ ...editedKoreaProfile, bgTransportEur: Number(v) || 0 })
        }
      />
      <NumberField
        label={t('cal_field_tech_inspection_eur')}
        value={Number(editedKoreaProfile?.technicalInspectionEur || 0)}
        onChange={(v) =>
          setEditedKoreaProfile({
            ...editedKoreaProfile,
            technicalInspectionEur: Number(v) || 0,
          })
        }
      />
      <NumberField
        label={t('cal_field_bb_cars_commission')}
        value={Number(editedKoreaProfile?.bbCarsCommissionEur || 0)}
        onChange={(v) =>
          setEditedKoreaProfile({
            ...editedKoreaProfile,
            bbCarsCommissionEur: Number(v) || 0,
          })
        }
      />
      <NumberField
        label={t('cal_field_additional_fees_eur')}
        value={Number(editedKoreaProfile?.additionalFeesEur || 0)}
        onChange={(v) =>
          setEditedKoreaProfile({ ...editedKoreaProfile, additionalFeesEur: Number(v) || 0 })
        }
      />
      <NumberField
        label={t('cal_field_damaged_customs_factor')}
        value={Number(editedKoreaProfile?.damagedCustomsFactor ?? 0.7)}
        step={0.01}
        onChange={(v) =>
          setEditedKoreaProfile({
            ...editedKoreaProfile,
            damagedCustomsFactor: Number(v) || 0,
          })
        }
      />
      <NumberField
        label={t('cal_field_damage_handling_fee')}
        value={Number(editedKoreaProfile?.damageHandlingFeeKoreaUsd ?? 250)}
        onChange={(v) =>
          setEditedKoreaProfile({
            ...editedKoreaProfile,
            damageHandlingFeeKoreaUsd: Number(v) || 0,
          })
        }
      />
      <NumberField
        label={t('cal_field_official_fees')}
        value={Number(editedKoreaProfile?.officialFeesUsd || 0)}
        onChange={(v) =>
          setEditedKoreaProfile({ ...editedKoreaProfile, officialFeesUsd: Number(v) || 0 })
        }
      />
    </div>
    <div className="flex gap-2 pt-2">
      <button
        onClick={saveKoreaProfile}
        disabled={saving}
        className="btn-primary flex items-center gap-2"
        data-testid="save-korea-profile-btn"
      >
        <FloppyDisk size={16} />
        {saving ? t('adm2_034bf16d6c') : t('adm2_79d9f1b64d')}
      </button>
      <button
        onClick={cancelEditingKorea}
        className="px-4 py-2 border border-[#E4E4E7] rounded-xl hover:bg-[#F4F4F5] flex items-center gap-2"
        data-testid="cancel-korea-profile-btn"
      >
        <X size={16} /> {t('adm_cancel')}
      </button>
    </div>
  </div>
);

const KoreaProfileView = ({ koreaProfile, t }) => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      <ViewField
        label={t('adm_auction_fee')}
        value={`${(koreaProfile.auctionFeePercent || 0).toFixed(1)}%`}
      />
      <ViewField
        label={t('adm_use_package')}
        value={koreaProfile.useLogisticsPackage ? t('cal_logistics_package_label') : t('cal_logistics_itemized')}
      />
      <ViewField
        label={t('adm_logistics_pkg')}
        value={`$${Number(koreaProfile.logisticsPackage || 0).toLocaleString()}`}
      />
      <ViewField
        label={t('adm_korea_inland')}
        value={`$${Number(koreaProfile.koreaInlandTransport || 0).toLocaleString()}`}
      />
      <ViewField
        label={t('adm_sea_shipping')}
        value={`$${Number(koreaProfile.seaShipping || 0).toLocaleString()}`}
      />
      <ViewField
        label={t('adm_insurance')}
        value={`$${Number(koreaProfile.insurance || 0).toLocaleString()}`}
      />
      <ViewField
        label={t('adm_forwarder')}
        value={`$${Number(koreaProfile.forwarderFee || 0).toLocaleString()}`}
      />
      <ViewField
        label={t('adm_docsmail')}
        value={`$${Number(koreaProfile.documentsMailFee || 0).toLocaleString()}`}
      />
      <ViewField
        label={t('adm_customs_duty')}
        value={`${((koreaProfile.customsDutyRate || 0) * 100).toFixed(1)}%`}
      />
      <ViewField label="VAT" value={`${((koreaProfile.vatRate || 0) * 100).toFixed(1)}%`} />
      <ViewField
        label={t('adm_undervalue')}
        value={`${((koreaProfile.undervaluePercent || 0) * 100).toFixed(1)}%`}
      />
      <ViewField label={t('adm_fx_usdeur')} value={(koreaProfile.fxUsdToEur || 0).toFixed(3)} />
      <ViewField
        label={t('adm_bibi_service')}
        value={`$${Number(koreaProfile.bibiServiceFee || 0).toLocaleString()}`}
      />
      <ViewField
        label={t('adm_bg_transport')}
        value={`€${Number(koreaProfile.bgTransportEur || 0).toLocaleString()}`}
      />
      <ViewField
        label={t('adm_tech_inspection')}
        value={`€${Number(koreaProfile.technicalInspectionEur || 0).toLocaleString()}`}
      />
      <ViewField
        label={t('adm_bb_cars_comm')}
        value={`€${Number(koreaProfile.bbCarsCommissionEur || 0).toLocaleString()}`}
      />
      <ViewField
        label={t('adm_add_fees')}
        value={`€${Number(koreaProfile.additionalFeesEur || 0).toLocaleString()}`}
      />
      <ViewField
        label={t('adm_damaged_factor')}
        value={`×${Number(koreaProfile.damagedCustomsFactor ?? 0.7).toFixed(2)}`}
      />
      <ViewField
        label={t('adm_damage_handling')}
        value={`$${Number(koreaProfile.damageHandlingFeeKoreaUsd ?? 250).toLocaleString()}`}
      />
      <ViewField
        label={t('adm_official_fees')}
        value={`$${Number(koreaProfile.officialFeesUsd || 0).toLocaleString()}`}
      />
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════════════
// EXTRAS SECTION (Технотест / Ремонт / Други) — used in both tabs
// Persists as profile fields: technicalInspectionUsd / repairExpenses / otherExpenses
// (Korea also persists technicalInspectionEur via its main profile already)
// ════════════════════════════════════════════════════════════════════════
const ExtrasSection = ({
  profile,
  editedProfile,
  setEditedProfile,
  isAdmin,
  onSave,
  saving,
  t,
  isKorea = false,
  testIdPrefix,
}) => {
  const ed = editedProfile || profile || {};
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <NumberField
          label={t('cal_field_technical_inspection_usd')}
          value={Number(
            (isKorea ? ed?.technicalInspectionEur : ed?.technicalInspectionUsd) || 0
          )}
          onChange={(v) =>
            isAdmin &&
            setEditedProfile({
              ...ed,
              ...(isKorea
                ? { technicalInspectionEur: Number(v) || 0 }
                : { technicalInspectionUsd: Number(v) || 0 }),
            })
          }
          testId={`${testIdPrefix}-technotest-input`}
          disabled={!isAdmin}
        />
        <NumberField
          label={t('cal_field_customs_duty_rate')}
          value={Number(((profile?.customsDutyRate) || 0) * 100)}
          onChange={() => {}}
          disabled
          testId={`${testIdPrefix}-customs-input`}
        />
        <NumberField
          label={t('cal_field_repair_expenses')}
          value={Number(ed?.repairExpenses || 0)}
          onChange={(v) =>
            isAdmin && setEditedProfile({ ...ed, repairExpenses: Number(v) || 0 })
          }
          testId={`${testIdPrefix}-repair-input`}
          disabled={!isAdmin}
        />
        <NumberField
          label={t('cal_field_other_expenses')}
          value={Number(ed?.otherExpenses || 0)}
          onChange={(v) =>
            isAdmin && setEditedProfile({ ...ed, otherExpenses: Number(v) || 0 })
          }
          testId={`${testIdPrefix}-other-input`}
          disabled={!isAdmin}
        />
      </div>

      {isAdmin && (
        <div className="flex gap-2 pt-2">
          <button
            onClick={() =>
              onSave({
                ...(isKorea
                  ? { technicalInspectionEur: Number(ed?.technicalInspectionEur) || 0 }
                  : { technicalInspectionUsd: Number(ed?.technicalInspectionUsd) || 0 }),
                repairExpenses: Number(ed?.repairExpenses) || 0,
                otherExpenses: Number(ed?.otherExpenses) || 0,
              })
            }
            disabled={saving}
            className="btn-primary flex items-center gap-2"
            data-testid={`${testIdPrefix}-save-btn`}
          >
            <FloppyDisk size={16} />
            {saving ? t('adm2_034bf16d6c') : t('adm2_79d9f1b64d')}
          </button>
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════
// SHARED PRIMITIVES (CollapsibleSection / StatCard / ViewField / Inputs / Rate rows)
// ════════════════════════════════════════════════════════════════════════
const CollapsibleSection = ({
  title,
  subtitle,
  icon: Icon,
  isExpanded,
  onToggle,
  headerAction,
  children,
}) => (
  <div className="card overflow-hidden" data-testid={`section-${String(title).toLowerCase().replace(/\s/g, '-').slice(0, 60)}`}>
    <button
      type="button"
      onClick={onToggle}
      className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors focus:outline-none"
      style={{ outline: 'none', boxShadow: 'none' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 bg-[#F4F4F5] rounded-lg flex items-center justify-center shrink-0">
          <Icon size={18} className="text-[#18181B]" />
        </div>
        <div className="text-left min-w-0">
          <h2 className="font-semibold text-[#18181B] text-sm leading-tight truncate">{title}</h2>
          <p className="text-xs text-[#71717A] leading-tight mt-0.5 truncate">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {headerAction}
        {isExpanded ? (
          <CaretUp size={18} className="text-[#71717A]" />
        ) : (
          <CaretDown size={18} className="text-[#71717A]" />
        )}
      </div>
    </button>
    {isExpanded && (
      <div className="px-4 py-3 border-t border-[#E4E4E7]">{children}</div>
    )}
  </div>
);

const StatCard = ({ icon: Icon, label, value, compact }) => (
  <div className={`kpi-card ${compact ? 'p-3' : ''}`}>
    <div className="flex items-center gap-2">
      <Icon size={compact ? 16 : 24} weight="duotone" className="text-[#18181B]" />
      <div>
        <div className={`font-bold text-[#18181B] ${compact ? 'text-base' : 'text-xl'}`}>{value}</div>
        <div className="text-xs text-[#71717A]">{label}</div>
      </div>
    </div>
  </div>
);

const ViewField = ({ label, value }) => (
  <div className="bg-[#F4F4F5] rounded-lg px-3 py-2">
    <div className="text-[10px] text-[#71717A] uppercase tracking-wider">{label}</div>
    <div className="font-medium text-sm text-[#18181B]">{value}</div>
  </div>
);

const InputField = ({ label, value, onChange, disabled }) => (
  <div>
    <label className="block text-xs font-medium text-[#71717A] uppercase tracking-wider mb-1">
      {label}
    </label>
    <input
      type="text"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="input"
    />
  </div>
);

/**
 * NumberField — clean numeric input.
 *
 * Доопр #10: the previous implementation kept a leading 0 whenever the
 * default value was 0, so typing "324" produced "0324". Fix:
 *   1.  Display an EMPTY string when value === 0 (placeholder shows "0").
 *   2.  Strip any non-digit / non-dot characters before parsing.
 *   3.  Drop a single leading zero as soon as the user types another digit
 *       ("0324" → "324").
 *   4.  type="text" + inputMode="decimal" so we get the numeric keyboard
 *       on mobile but never get browser-side "0324" rendering.
 */
const NumberField = ({ label, value, onChange, step, disabled, testId, allowDecimal = true }) => {
  const display = (value === 0 || value === null || value === undefined) ? '' : String(value);
  return (
    <div>
      <label className="block text-xs font-medium text-[#71717A] uppercase tracking-wider mb-1">
        {label}
      </label>
      <input
        type="text"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        step={step ?? 'any'}
        value={display}
        disabled={disabled}
        placeholder="0"
        onChange={(e) => {
          let raw = e.target.value || '';
          // Strip anything that isn't a digit, dot or minus sign
          raw = allowDecimal
            ? raw.replace(/[^0-9.\-]/g, '')
            : raw.replace(/[^0-9\-]/g, '');
          // Drop leading zeros: "0324" → "324", "0.5" stays "0.5".
          raw = raw.replace(/^(-?)0+(?=\d)/, '$1');
          if (raw === '' || raw === '-' || raw === '.') {
            onChange(0);
            return;
          }
          const n = Number(raw);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className="input"
        data-testid={testId}
      />
    </div>
  );
};

// ── Rate Section ─────────────────────────────────────────────────────────
const RateSectionContent = ({
  rates,
  profileCode,
  rateType,
  onSave,
  onDelete,
  locationField,
  vehicleTypesCatalog = [],
  portsCatalog = [],
}) => {
  const { t } = useLang();
  const vehicleTypes = (vehicleTypesCatalog.length
    ? vehicleTypesCatalog
    : [
        { code: 'sedan', name: t('adm_sedan') },
        { code: 'suv', name: 'SUV' },
        { code: 'bigSUV', name: t('adm_big_suv') },
        { code: 'pickup', name: t('adm_pickup') },
      ]
  ).map((v) => ({ value: v.code, label: v.name }));

  const portOptions = (portsCatalog || []).map((p) => ({
    value: p.code || p.id,
    label: `${p.name}${p.country ? ` (${p.country})` : ''}`,
  }));

  const [newRate, setNewRate] = useState({ location: '', vehicleType: 'sedan', amount: 0 });

  const addNewRate = () => {
    if (!newRate.location || !newRate.amount) {
      toast.error(t('adm_fill_in_all_fields'));
      return;
    }
    onSave({
      profileCode,
      rateType,
      [locationField]: newRate.location,
      vehicleType: newRate.vehicleType,
      amount: newRate.amount,
    });
    setNewRate({ location: '', vehicleType: 'sedan', amount: 0 });
  };

  return (
    <div className="overflow-x-auto">
      <table className="table-premium w-full min-w-[450px]">
        <thead>
          <tr>
            <th>{locationField === 'originCode' ? 'Port' : 'Destination'}</th>
            <th>{t('adm_vehicle_type')}</th>
            <th>Amount ($)</th>
            <th className="text-right">{t('adm_actions_2')}</th>
          </tr>
        </thead>
        <tbody>
          {rates.map((rate) => (
            <RateRow
              key={rate._id ?? rate.id}
              rate={rate}
              profileCode={profileCode}
              rateType={rateType}
              locationField={locationField}
              onSave={onSave}
              onDelete={onDelete}
            />
          ))}
          <tr className="bg-[#F4F4F5]">
            <td className="overflow-visible">
              {portOptions.length ? (
                <CustomSelect
                  value={newRate.location}
                  onChange={(val) => setNewRate({ ...newRate, location: val })}
                  options={portOptions}
                  placeholder={t('adm_select_port')}
                />
              ) : (
                <input
                  type="text"
                  value={newRate.location}
                  onChange={(e) => setNewRate({ ...newRate, location: e.target.value })}
                  placeholder={rateType === 'eu_delivery' ? 'BG' : 'NJ, GA…'}
                  className="input w-full max-w-[120px]"
                />
              )}
            </td>
            <td className="overflow-visible">
              <CustomSelect
                value={newRate.vehicleType}
                onChange={(val) => setNewRate({ ...newRate, vehicleType: val })}
                options={vehicleTypes}
                placeholder={t('adm_sedan')}
              />
            </td>
            <td>
              <input
                type="number"
                value={newRate.amount}
                onChange={(e) => setNewRate({ ...newRate, amount: Number(e.target.value) })}
                className="input w-full max-w-[100px]"
              />
            </td>
            <td>
              <button
                onClick={addNewRate}
                className="p-2 bg-[#18181B] text-white rounded-lg hover:bg-[#27272A]"
              >
                <Plus size={14} />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const RateRow = ({ rate, profileCode, rateType, locationField, onSave, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [editedAmount, setEditedAmount] = useState(rate.amount);
  const handleSave = () => {
    onSave({ ...rate, profileCode, rateType, amount: editedAmount });
    setEditing(false);
  };
  return (
    <tr>
      <td className="font-mono text-sm">{rate[locationField] || '—'}</td>
      <td className="text-sm">{rate.vehicleType}</td>
      <td>
        {editing ? (
          <input
            type="number"
            value={editedAmount}
            onChange={(e) => setEditedAmount(Number(e.target.value))}
            className="input w-20"
            autoFocus
          />
        ) : (
          <span className="font-medium text-sm">${rate.amount?.toLocaleString()}</span>
        )}
      </td>
      <td>
        <div className="flex items-center justify-end gap-1">
          {editing ? (
            <button onClick={handleSave} className="p-1.5 bg-[#059669] text-white rounded-lg">
              <FloppyDisk size={12} />
            </button>
          ) : (
            <button onClick={() => setEditing(true)} className="p-1.5 hover:bg-[#F4F4F5] rounded-lg">
              <Gear size={12} className="text-[#71717A]" />
            </button>
          )}
          <button
            onClick={() => onDelete(rate._id ?? rate.id)}
            className="p-1.5 hover:bg-[#FEE2E2] rounded-lg"
          >
            <Trash size={12} className="text-[#DC2626]" />
          </button>
        </div>
      </td>
    </tr>
  );
};

const AuctionRuleRow = ({ rule, profileCode, onSave, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [editedFee, setEditedFee] = useState(rule.fee);
  const handleSave = () => {
    onSave({ ...rule, profileCode, fee: editedFee });
    setEditing(false);
  };
  return (
    <tr>
      <td className="font-mono text-sm">${rule.minBid?.toLocaleString()}</td>
      <td className="font-mono text-sm">${rule.maxBid?.toLocaleString()}</td>
      <td>
        {editing ? (
          <input
            type="number"
            value={editedFee}
            onChange={(e) => setEditedFee(Number(e.target.value))}
            className="input w-20"
            autoFocus
          />
        ) : (
          <span className="font-medium text-[#D97706] text-sm">${rule.fee?.toLocaleString()}</span>
        )}
      </td>
      <td>
        <div className="flex items-center justify-end gap-1">
          {editing ? (
            <button onClick={handleSave} className="p-1.5 bg-[#059669] text-white rounded-lg">
              <FloppyDisk size={12} />
            </button>
          ) : (
            <button onClick={() => setEditing(true)} className="p-1.5 hover:bg-[#F4F4F5] rounded-lg">
              <Gear size={12} className="text-[#71717A]" />
            </button>
          )}
          <button
            onClick={() => onDelete(rule._id ?? rule.id)}
            className="p-1.5 hover:bg-[#FEE2E2] rounded-lg"
          >
            <Trash size={12} className="text-[#DC2626]" />
          </button>
        </div>
      </td>
    </tr>
  );
};

const NewAuctionRuleRow = ({ profileCode, onSave }) => {
  const { t } = useLang();
  const [newRule, setNewRule] = useState({ minBid: 0, maxBid: 0, fee: 0 });
  const handleAdd = () => {
    if (!newRule.maxBid || !newRule.fee) {
      toast.error(t('adm_fill_in_all_fields'));
      return;
    }
    onSave({ profileCode, ...newRule });
    setNewRule({ minBid: 0, maxBid: 0, fee: 0 });
  };
  return (
    <tr className="bg-[#F4F4F5]">
      <td>
        <input
          type="number"
          value={newRule.minBid}
          onChange={(e) => setNewRule({ ...newRule, minBid: Number(e.target.value) })}
          className="input w-full"
          placeholder="0"
        />
      </td>
      <td>
        <input
          type="number"
          value={newRule.maxBid}
          onChange={(e) => setNewRule({ ...newRule, maxBid: Number(e.target.value) })}
          className="input w-full"
          placeholder="999"
        />
      </td>
      <td>
        <input
          type="number"
          value={newRule.fee}
          onChange={(e) => setNewRule({ ...newRule, fee: Number(e.target.value) })}
          className="input w-full"
          placeholder="0"
        />
      </td>
      <td>
        <button
          onClick={handleAdd}
          className="p-1.5 bg-[#059669] text-white rounded-lg hover:bg-[#047857]"
        >
          <Plus size={14} />
        </button>
      </td>
    </tr>
  );
};

/* ──────────────────────────────────────────────────────────────────────
 * GenerateContractButton (Доопр #21)
 *
 * After Live Preview computes a result, this widget allows the admin to
 * pick a customer and freeze the calculator snapshot into a new contract
 * via POST /api/contracts/from-calculator. The created contract appears
 * in the customer's 360 card and in /admin/legal.
 * ──────────────────────────────────────────────────────────────────── */
const GenerateContractButton = ({ previewResult, previewInput, t }) => {
  const tt = (key, fallback) => { const v = t(key); return (!v || v === key) ? fallback : v; };
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [creating, setCreating] = useState(false);
  // ── BG commission contract extras (Договор за поръчка) ──────────────
  const [bgFields, setBgFields] = useState({
    client_national_id: '',
    client_address:     '',
    vin:                '',
    make:               '',
    model:              '',
    year:               '',
    country:            'САЩ',
    auction:            '',
    max_bid:            '',
  });
  const setBg = (k, v) => setBgFields((p) => ({ ...p, [k]: v }));

  const totalEur = Number(previewResult?.totals?.visible ?? previewResult?.calculation?.total ?? 0);

  const openPicker = async () => {
    setOpen(true);
    try {
      const r = await axios.get(`${API_URL}/api/customers`, { params: { limit: 500 } });
      setCustomers(r.data?.items || r.data?.customers || []);
    } catch { /* silent */ }
  };

  const generate = async () => {
    if (!customerId) { toast.error(tt('pickCustomer', 'Pick a customer')); return; }
    setCreating(true);
    try {
      const snapshot = {
        ...(previewInput || {}),
        formattedBreakdown: previewResult?.formattedBreakdown,
        totals:             previewResult?.totals,
        hiddenBreakdown:    previewResult?.hiddenBreakdown,
        calculation:        previewResult?.calculation,
        total:              totalEur,
        totalEur,
      };
      // Build vehicle_spec from form + calculator inputs
      const vehicle_spec = {
        make:    bgFields.make || previewInput?.brand || previewInput?.make || '',
        model:   bgFields.model || previewInput?.model || '',
        year:    bgFields.year ? parseInt(bgFields.year) : (previewInput?.year || null),
        vin:     (bgFields.vin || previewInput?.vin || '').toUpperCase(),
        country: bgFields.country || (previewInput?.country || 'САЩ'),
        auction: bgFields.auction || previewInput?.source || '',
        max_bid: bgFields.max_bid ? parseFloat(bgFields.max_bid) : (Number(previewInput?.price) || null),
        total_budget: totalEur || null,
        currency: 'EUR',
      };
      const body = {
        customer_id: customerId,
        template:    'purchase',
        title:       tt('adm_contract_title', 'Auto purchase contract (from calculator)'),
        currency:    'EUR',
        language:    'bg',
        place:       'София',
        snapshot,
        snapshot_taken_at: new Date().toISOString(),
        client_national_id: bgFields.client_national_id || null,
        client_address:     bgFields.client_address || null,
        vehicle_spec,
        financial_terms: {
          deposit_pct: 15,
          deposit_min_eur: 1000,
          executor_fee_eur: 800,
          full_prepay_platforms: ['MANHEIM', 'ENCAR'],
          duration_days: 180,
        },
      };
      const r = await axios.post(`${API_URL}/api/contracts/from-calculator`, body);
      const contractId = r.data?.data?.id;
      toast.success(tt('adm_contract_created', 'Contract created'));
      setOpen(false);
      if (contractId) {
        window.location.href = `/admin/contracts?tab=timeline&id=${contractId}`;
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to create contract');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-[#FEAE00] to-[#F59E0B] rounded-xl p-3 mt-3 text-[#18181B]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-sm">{tt('adm_generate_contract', 'Generate Contract from this calculation')}</h3>
          <p className="text-[11px] opacity-80 mt-0.5">{tt('adm_generate_contract_hint', 'Freezes the snapshot and creates a new draft contract for the chosen customer.')}</p>
        </div>
        <button
          onClick={openPicker}
          data-testid="generate-contract-btn"
          className="shrink-0 px-3 h-9 rounded-lg bg-[#18181B] text-white text-[12px] font-semibold hover:bg-[#27272A]"
        >
          {tt('adm_generate_contract_cta', 'Generate Contract')}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 my-8">
            <h3 className="text-base font-bold text-[#18181B] mb-3">{tt('calcContract_title', 'Commission contract')} — {tt('calcContract_pickCustomer', 'Pick a customer')}</h3>
            <div className="mb-3 p-3 bg-[#F4F4F5] rounded-lg text-[12px]">
              <div className="flex justify-between"><span>{tt('calcContract_snapshotTotal', 'Snapshot total')}:</span><b>€ {totalEur.toLocaleString()}</b></div>
              <div className="flex justify-between text-[#71717A]"><span>{tt('calcContract_port', 'Port')}:</span><span>{previewInput?.port || '—'}</span></div>
              <div className="flex justify-between text-[#71717A]"><span>{tt('calcContract_vehicle', 'Vehicle')}:</span><span>$ {Number(previewInput?.price || 0).toLocaleString()}</span></div>
            </div>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-zinc-300 bg-white text-sm mb-3"
              data-testid="generate-contract-customer"
            >
              <option value="">— {tt('calcContract_pickCustomer', 'Pick a customer')} —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {(c.name || `${c.firstName || ''} ${c.lastName || ''}`).trim() || c.id} {c.email ? `· ${c.email}` : ''}
                </option>
              ))}
            </select>
            {/* ── BG ВЪЗЛОЖИТЕЛ shortcuts ── */}
            <div className="space-y-2 mb-3">
              <input type="text" value={bgFields.client_national_id}
                onChange={(e) => setBg('client_national_id', e.target.value)}
                placeholder={tt('calcContract_egnPh', 'National ID (ЕГН / ЛНЧ)')}
                className="w-full h-9 px-3 rounded-lg border border-zinc-300 bg-white text-[13px]"
                data-testid="calc-bg-egn" />
              <input type="text" value={bgFields.client_address}
                onChange={(e) => setBg('client_address', e.target.value)}
                placeholder={tt('calcContract_addressPh', 'Address (city, street, no, floor, apt)')}
                className="w-full h-9 px-3 rounded-lg border border-zinc-300 bg-white text-[13px]"
                data-testid="calc-bg-address" />
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input type="text" value={bgFields.make} onChange={(e) => setBg('make', e.target.value)} placeholder={tt('calcContract_make', 'Make')} className="h-9 px-3 rounded-lg border border-zinc-300 bg-white text-[13px]" data-testid="calc-bg-make" />
              <input type="text" value={bgFields.model} onChange={(e) => setBg('model', e.target.value)} placeholder={tt('calcContract_model', 'Model')} className="h-9 px-3 rounded-lg border border-zinc-300 bg-white text-[13px]" data-testid="calc-bg-model" />
              <input type="number" value={bgFields.year} onChange={(e) => setBg('year', e.target.value)} placeholder={tt('calcContract_year', 'Year')} className="h-9 px-3 rounded-lg border border-zinc-300 bg-white text-[13px]" data-testid="calc-bg-year" />
              <input type="text" maxLength={17} value={bgFields.vin} onChange={(e) => setBg('vin', e.target.value.toUpperCase())} placeholder={tt('calcContract_vinPh', 'VIN (17 chars)')} className="h-9 px-3 rounded-lg border border-zinc-300 bg-white text-[13px] font-mono" data-testid="calc-bg-vin" />
              <select value={bgFields.country} onChange={(e) => setBg('country', e.target.value)} className="h-9 px-3 rounded-lg border border-zinc-300 bg-white text-[13px]" data-testid="calc-bg-country">
                <option value="САЩ">{tt('calcContract_countryUSA', 'USA')}</option>
                <option value="Южна Корея">{tt('calcContract_countryKorea', 'South Korea')}</option>
                <option value="Канада">{tt('calcContract_countryCanada', 'Canada')}</option>
                <option value="Германия">{tt('calcContract_countryGermany', 'Germany')}</option>
                <option value="Друго">{tt('calcContract_countryOther', 'Other')}</option>
              </select>
              <select value={bgFields.auction} onChange={(e) => setBg('auction', e.target.value)} className="h-9 px-3 rounded-lg border border-zinc-300 bg-white text-[13px]" data-testid="calc-bg-auction">
                <option value="">{tt('calcContract_auctionPlaceholder', 'Auction —')}</option>
                <option>COPART</option><option>IAAI</option><option>MANHEIM</option><option>ENCAR</option>
              </select>
              <input type="number" value={bgFields.max_bid} onChange={(e) => setBg('max_bid', e.target.value)} placeholder={tt('calcContract_maxBidPh', 'Max bid (EUR)')} className="h-9 px-3 rounded-lg border border-zinc-300 bg-white text-[13px] col-span-2" data-testid="calc-bg-max-bid" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setOpen(false)} className="flex-1 h-10 rounded-xl border border-zinc-300 bg-white text-sm" data-testid="calc-bg-cancel">{tt('cancel', 'Cancel')}</button>
              <button onClick={generate} disabled={creating || !customerId}
                className="flex-1 h-10 rounded-xl bg-[#18181B] text-white text-sm font-semibold disabled:opacity-50"
                data-testid="generate-contract-submit">
                {creating ? tt('saving', 'Saving…') : tt('calcContract_submit', 'Create contract')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalculatorAdmin;
