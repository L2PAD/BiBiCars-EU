/**
 * ConvertLeadModal — turn a CRM lead into a real client.
 *
 * This is the cross-cutting onboarding entry point: a lead (which may have been
 * created from a cold call, with no registration) is promoted to a client. The
 * manager confirms / adds the client's email and can fire a 30-day invitation
 * so the client sets a password and gains cabinet access. No registration or
 * contract by the client is required up-front.
 *
 * POST /api/leads/:id/convert { email, sendInvite } → { customer, invite? }
 */
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../App';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  UserPlus,
  EnvelopeSimple,
  PaperPlaneTilt,
  CheckCircle,
  Copy,
  ArrowRight,
  SpinnerGap,
} from '@phosphor-icons/react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ConvertLeadModal({ lead, open, onClose, onConverted, navigate }) {
  const [email, setEmail] = useState('');
  const [sendInvite, setSendInvite] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { customer, invite }

  useEffect(() => {
    if (open && lead) {
      setEmail((lead.email || '').trim());
      setSendInvite(true);
      setResult(null);
      setSubmitting(false);
    }
  }, [open, lead]);

  if (!lead) return null;

  const leadName =
    `${lead.firstName || ''} ${lead.lastName || ''}`.trim() ||
    lead.name ||
    '(no name)';

  const emailValid = !email || EMAIL_RE.test(email.trim());

  const submit = async (e) => {
    e.preventDefault();
    if (sendInvite && !email.trim()) {
      toast.error('An email is required to send an invitation');
      return;
    }
    if (email && !EMAIL_RE.test(email.trim())) {
      toast.error('Please enter a valid email');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/leads/${lead.id}/convert`, {
        email: email.trim() || undefined,
        sendInvite: !!(sendInvite && email.trim()),
      });
      setResult(data || {});
      toast.success(
        data?.reused ? 'Linked to existing client' : 'Client created from lead'
      );
      if (onConverted) onConverted();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not create client');
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = () => {
    const link = result?.invite?.invite_link;
    if (!link) return;
    try {
      navigator.clipboard.writeText(link);
      toast.success('Invite link copied');
    } catch {
      toast.message(link);
    }
  };

  const goToClient = () => {
    const cid = result?.customer?.id;
    onClose();
    if (cid && navigate) navigate(`/admin/customers/${cid}/360`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="max-w-md bg-white rounded-2xl border border-[#E4E4E7]"
        data-testid="convert-lead-modal"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#18181B] flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#FEAE00] flex items-center justify-center">
              <UserPlus size={18} weight="bold" className="text-black" />
            </span>
            Create client from lead
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <form onSubmit={submit} className="mt-2 space-y-4">
            <div className="bg-[#FAFAFA] border border-[#EFEFEF] rounded-xl px-4 py-3">
              <div className="text-[11px] uppercase tracking-wide text-[#A1A1AA] font-semibold">
                Lead
              </div>
              <div className="text-[15px] font-semibold text-[#18181B]">{leadName}</div>
              {lead.phone && (
                <div className="text-[13px] text-[#71717A] mt-0.5">{lead.phone}</div>
              )}
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#3F3F46] mb-1.5">
                Client email
              </label>
              <div className="relative">
                <EnvelopeSimple
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@email.com"
                  className={`w-full h-[44px] rounded-lg border ${
                    emailValid ? 'border-[#E4E4E7]' : 'border-red-400'
                  } pl-10 pr-3 text-[#18181B] focus:outline-none focus:border-[#FEAE00]`}
                  data-testid="convert-email-input"
                />
              </div>
              <p className="text-[11px] text-[#A1A1AA] mt-1">
                Used to invite the client to set a password and access their cabinet.
              </p>
            </div>

            <label
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition ${
                sendInvite && email.trim()
                  ? 'border-[#FEAE00] bg-[#FEAE00]/5'
                  : 'border-[#E4E4E7]'
              } ${!email.trim() ? 'opacity-60' : ''}`}
            >
              <input
                type="checkbox"
                checked={sendInvite}
                disabled={!email.trim()}
                onChange={(e) => setSendInvite(e.target.checked)}
                className="mt-1 accent-[#FEAE00] w-4 h-4"
                data-testid="convert-invite-checkbox"
              />
              <span>
                <span className="block text-[13px] font-semibold text-[#18181B] flex items-center gap-1.5">
                  <PaperPlaneTilt size={15} weight="bold" className="text-[#FEAE00]" />
                  Send invitation email
                </span>
                <span className="block text-[12px] text-[#71717A] mt-0.5">
                  A 30-day link lets the client set their password and sign in.
                </span>
              </span>
            </label>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-[46px] rounded-lg border border-[#E4E4E7] text-[#3F3F46] font-semibold hover:bg-[#FAFAFA]"
                data-testid="convert-cancel-btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 h-[46px] rounded-lg bg-[#FEAE00] hover:bg-[#FFBF2D] text-black font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="convert-submit-btn"
              >
                {submitting ? (
                  <>
                    <SpinnerGap size={18} className="animate-spin" /> Creating…
                  </>
                ) : (
                  'Create client'
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-2 space-y-4" data-testid="convert-result">
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <CheckCircle size={26} weight="fill" className="text-emerald-500" />
              <div>
                <div className="font-semibold text-emerald-800">
                  {result.reused ? 'Linked to existing client' : 'Client created'}
                </div>
                <div className="text-[13px] text-emerald-700">
                  {result.customer?.name || leadName}
                </div>
              </div>
            </div>

            {result.invite ? (
              <div className="rounded-xl border border-[#E4E4E7] p-4">
                <div className="text-[12px] font-semibold text-[#3F3F46] mb-1 flex items-center gap-1.5">
                  <PaperPlaneTilt size={15} weight="bold" className="text-[#FEAE00]" />
                  Invitation {result.invite.emailMode === 'resend' ? 'sent' : 'ready'}
                </div>
                <p className="text-[12px] text-[#71717A] mb-2">
                  {result.invite.emailMode === 'resend'
                    ? 'An activation email was sent to the client.'
                    : 'Email delivery is in dry-run mode (no provider key yet). Share this activation link directly:'}
                </p>
                <div className="flex items-center gap-2 bg-[#FAFAFA] border border-[#EFEFEF] rounded-lg px-3 py-2">
                  <span className="text-[12px] text-[#3F3F46] font-mono truncate flex-1">
                    {result.invite.invite_link}
                  </span>
                  <button
                    onClick={copyLink}
                    className="shrink-0 p-1.5 rounded-md hover:bg-[#EFEFEF] text-[#71717A]"
                    title="Copy link"
                    data-testid="convert-copy-link"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-[#71717A]">
                No invitation was sent. You can invite the client or set a password
                later from their card.
              </p>
            )}

            <button
              onClick={goToClient}
              className="w-full h-[46px] rounded-lg bg-[#18181B] hover:bg-black text-white font-semibold flex items-center justify-center gap-2"
              data-testid="convert-goto-client"
            >
              Open client card <ArrowRight size={16} weight="bold" />
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
