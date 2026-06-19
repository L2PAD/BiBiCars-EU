/**
 * CustomerAccessPanel — Customer 360 "Account" tab.
 *
 * Cross-cutting client account control for staff (admin · team_lead · manager):
 *   • shows the client's cabinet-access state (no access / invited / active)
 *   • send or resend a 30-day invitation (email + dry-run link)
 *   • set / reset the client's password directly
 *
 * Endpoints:
 *   GET  /api/customers/:id/account
 *   POST /api/customers/:id/invite        { email? }
 *   POST /api/customers/:id/set-password  { password, logoutAll? }
 */
import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../App';
import { toast } from 'sonner';
import {
  ShieldCheck,
  PaperPlaneTilt,
  Key,
  Copy,
  CheckCircle,
  WarningCircle,
  Clock,
  EnvelopeSimple,
  SpinnerGap,
  Eye,
  EyeSlash,
} from '@phosphor-icons/react';

const STATE_META = {
  active: {
    label: 'Active account',
    desc: 'The client can sign in to their cabinet.',
    icon: CheckCircle,
    cls: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    dot: 'text-emerald-500',
  },
  invited: {
    label: 'Invitation pending',
    desc: 'An invitation was sent — waiting for the client to set a password.',
    icon: Clock,
    cls: 'bg-amber-50 border-amber-200 text-amber-700',
    dot: 'text-amber-500',
  },
  invite_expired: {
    label: 'Invitation expired',
    desc: 'The previous invitation expired. Send a new one.',
    icon: WarningCircle,
    cls: 'bg-red-50 border-red-200 text-red-700',
    dot: 'text-red-500',
  },
  no_access: {
    label: 'No cabinet access',
    desc: 'This client has no login yet. Invite them or set a password.',
    icon: ShieldCheck,
    cls: 'bg-[#FAFAFA] border-[#E4E4E7] text-[#3F3F46]',
    dot: 'text-[#A1A1AA]',
  },
};

export default function CustomerAccessPanel({ customerId, customerEmail }) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [lastInvite, setLastInvite] = useState(null);

  // password form
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [pwd, setPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [logoutAll, setLogoutAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/customers/${customerId}/account`);
      setAccount(data);
      setEmailInput((data.email || customerEmail || '').trim());
    } catch (e) {
      setAccount(null);
    } finally {
      setLoading(false);
    }
  }, [customerId, customerEmail]);

  useEffect(() => { load(); }, [load]);

  const sendInvite = async () => {
    if (!emailInput.trim()) {
      toast.error('Enter an email to invite the client');
      return;
    }
    setBusy(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/customers/${customerId}/invite`, {
        email: emailInput.trim(),
      });
      setLastInvite(data);
      toast.success(
        data.emailMode === 'resend' ? 'Invitation email sent' : 'Invitation created'
      );
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail === 'customer_email_required'
        ? 'A valid email is required'
        : (err.response?.data?.detail || 'Could not send invitation'));
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    if (pwd.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setBusy(true);
    try {
      await axios.post(`${API_URL}/api/customers/${customerId}/set-password`, {
        password: pwd,
        logoutAll,
      });
      toast.success('Password set — the client can sign in now');
      setPwd('');
      setShowPwdForm(false);
      setLogoutAll(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not set password');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = () => {
    const link = lastInvite?.invite_link;
    if (!link) return;
    try {
      navigator.clipboard.writeText(link);
      toast.success('Invite link copied');
    } catch {
      toast.message(link);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[#71717A]">
        <SpinnerGap size={26} className="animate-spin mr-2" /> Loading account…
      </div>
    );
  }

  if (!account) {
    return (
      <div className="py-12 text-center text-[#71717A]">Could not load account state.</div>
    );
  }

  const meta = STATE_META[account.state] || STATE_META.no_access;
  const StateIcon = meta.icon;
  const pending = account.pendingInvite;
  const inviteCtaLabel = account.state === 'active'
    ? 'Send invitation anyway'
    : (account.state === 'invited' ? 'Resend invitation' : 'Send invitation');

  return (
    <div className="max-w-2xl space-y-5" data-testid="customer-access-panel">
      {/* State banner */}
      <div className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 ${meta.cls}`}>
        <StateIcon size={24} weight="fill" className={meta.dot} />
        <div>
          <div className="font-semibold">{meta.label}</div>
          <div className="text-[13px] opacity-90">{meta.desc}</div>
          {pending && (
            <div className="text-[12px] mt-1 opacity-80">
              Invite for <b>{pending.email}</b>
              {pending.expires_at && !pending.expired
                ? ` · expires ${new Date(pending.expires_at).toLocaleDateString()}`
                : pending.expired ? ' · expired' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Invite block */}
      <div className="rounded-xl border border-[#E4E4E7] bg-white p-4">
        <div className="flex items-center gap-2 mb-1">
          <PaperPlaneTilt size={18} weight="bold" className="text-[#FEAE00]" />
          <h3 className="font-semibold text-[#18181B]">Invitation</h3>
        </div>
        <p className="text-[13px] text-[#71717A] mb-3">
          Email the client a 30-day link so they set their own password and access the cabinet.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <EnvelopeSimple size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="client@email.com"
              className="w-full h-[44px] rounded-lg border border-[#E4E4E7] pl-10 pr-3 text-[#18181B] focus:outline-none focus:border-[#FEAE00]"
              data-testid="access-email-input"
            />
          </div>
          <button
            onClick={sendInvite}
            disabled={busy}
            className="h-[44px] px-5 rounded-lg bg-[#FEAE00] hover:bg-[#FFBF2D] text-black font-bold disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
            data-testid="access-send-invite-btn"
          >
            {busy ? <SpinnerGap size={16} className="animate-spin" /> : <PaperPlaneTilt size={16} weight="bold" />}
            {inviteCtaLabel}
          </button>
        </div>

        {lastInvite?.invite_link && (
          <div className="mt-3">
            <div className="text-[12px] text-[#71717A] mb-1">
              {lastInvite.emailMode === 'resend'
                ? 'Email sent. Activation link:'
                : 'Dry-run mode (no email provider key). Share this link with the client:'}
            </div>
            <div className="flex items-center gap-2 bg-[#FAFAFA] border border-[#EFEFEF] rounded-lg px-3 py-2">
              <span className="text-[12px] text-[#3F3F46] font-mono truncate flex-1">
                {lastInvite.invite_link}
              </span>
              <button
                onClick={copyLink}
                className="shrink-0 p-1.5 rounded-md hover:bg-[#EFEFEF] text-[#71717A]"
                title="Copy link"
                data-testid="access-copy-link"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Password block */}
      <div className="rounded-xl border border-[#E4E4E7] bg-white p-4">
        <div className="flex items-center gap-2 mb-1">
          <Key size={18} weight="bold" className="text-[#18181B]" />
          <h3 className="font-semibold text-[#18181B]">
            {account.hasPassword ? 'Reset password' : 'Set password'}
          </h3>
        </div>
        <p className="text-[13px] text-[#71717A] mb-3">
          Set the client's cabinet password directly — useful when onboarding over the phone.
        </p>

        {!showPwdForm ? (
          <button
            onClick={() => setShowPwdForm(true)}
            className="h-[42px] px-4 rounded-lg border border-[#E4E4E7] text-[#18181B] font-semibold hover:bg-[#FAFAFA] flex items-center gap-2"
            data-testid="access-open-pwd-btn"
          >
            <Key size={16} /> {account.hasPassword ? 'Reset password' : 'Set password'}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
              <input
                type={showPwd ? 'text' : 'password'}
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="New password (min 6 chars)"
                minLength={6}
                className="w-full h-[44px] rounded-lg border border-[#E4E4E7] pl-10 pr-11 text-[#18181B] focus:outline-none focus:border-[#FEAE00]"
                data-testid="access-pwd-input"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#18181B] p-1"
                tabIndex={-1}
              >
                {showPwd ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <label className="flex items-center gap-2 text-[13px] text-[#3F3F46] cursor-pointer">
              <input
                type="checkbox"
                checked={logoutAll}
                onChange={(e) => setLogoutAll(e.target.checked)}
                className="accent-[#FEAE00] w-4 h-4"
              />
              Sign the client out of all active sessions
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowPwdForm(false); setPwd(''); }}
                className="h-[42px] px-4 rounded-lg border border-[#E4E4E7] text-[#3F3F46] font-semibold hover:bg-[#FAFAFA]"
              >
                Cancel
              </button>
              <button
                onClick={savePassword}
                disabled={busy || pwd.length < 6}
                className="h-[42px] px-5 rounded-lg bg-[#18181B] hover:bg-black text-white font-semibold disabled:opacity-50 flex items-center gap-2"
                data-testid="access-save-pwd-btn"
              >
                {busy ? <SpinnerGap size={16} className="animate-spin" /> : <CheckCircle size={16} weight="bold" />}
                Save password
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
