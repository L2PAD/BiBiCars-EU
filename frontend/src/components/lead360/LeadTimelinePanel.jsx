import React from 'react';
import * as Icons from '@phosphor-icons/react';
import { useLang } from '../../i18n';
import { statusLabel, sourceLabel } from '../leads/leadConstants';

const formatWhen = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch { return String(iso); }
};

// Build a fully-localized title/subtitle from the event `kind` + `params`,
// falling back to the backend-provided title/subtitle for unknown kinds.
const localize = (e, t, lang) => {
  const p = e.params || {};
  switch (e.kind) {
    case 'lead_created':
      return {
        title: t('tl_lead_created'),
        subtitle: `${t('tl_source')}: ${sourceLabel(lang, p.source) || '—'}`,
      };
    case 'status_change':
      return {
        title: `${t('tl_status')}: ${statusLabel(lang, p.from) || '?'} \u2192 ${statusLabel(lang, p.to) || '?'}`,
        subtitle: e.subtitle || '',
      };
    case 'call': {
      const dir = (p.direction || '').toLowerCase();
      const dirLabel =
        dir === 'outbound' ? t('tl_call_outbound')
        : dir === 'inbound' ? t('tl_call_inbound')
        : t('tl_call');
      return {
        title: `${dirLabel} \u2014 ${p.duration ?? 0}s`,
        subtitle: e.subtitle || '',
      };
    }
    case 'note':
      return { title: t('tl_note'), subtitle: e.subtitle || '' };
    case 'conversion':
      return { title: t('tl_conversion'), subtitle: e.subtitle || '' };
    default:
      return { title: e.title, subtitle: e.subtitle || '' };
  }
};

const LeadTimelinePanel = ({ items, loading, emptyText }) => {
  const { t, lang } = useLang();
  if (loading) return <div className="text-[12px] text-[#71717A] py-6 text-center">{t('tl_loading')}</div>;
  if (!items || items.length === 0) {
    return <div className="text-[12px] text-[#A1A1AA] italic py-6 text-center">{emptyText || t('tl_noEvents')}</div>;
  }
  return (
    <div className="relative pl-7" data-testid="lead-timeline-panel">
      <div className="absolute left-2 top-3 bottom-3 w-px bg-[#E4E4E7]"></div>
      <ul className="space-y-3">
        {items.map((e, idx) => {
          const IconCmp = (Icons[e.icon] || Icons.Clock);
          const { title, subtitle } = localize(e, t, lang);
          return (
            <li key={e.id || idx} className="relative" data-testid={`lead-timeline-event-${idx}`}>
              <div
                className="absolute -left-7 top-1 w-5 h-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white"
                style={{ backgroundColor: e.color || '#71717A' }}
              >
                <IconCmp size={10} weight="bold" />
              </div>
              <div className="bg-white border border-[#F4F4F5] rounded-xl px-3 py-2 hover:border-[#E4E4E7] transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[13px] font-semibold text-[#18181B] leading-tight">{title}</div>
                  <span className="text-[10px] text-[#A1A1AA] whitespace-nowrap shrink-0">{formatWhen(e.at)}</span>
                </div>
                {subtitle ? (
                  <div className="text-[11px] text-[#71717A] mt-1 break-words">{subtitle}</div>
                ) : null}
                {e.by ? (
                  <div className="text-[10px] text-[#A1A1AA] mt-1">{t('tl_by')} {e.by}</div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default LeadTimelinePanel;
