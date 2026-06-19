/**
 * InviteAcceptPage — public onboarding page for staff-created clients.
 *
 * Customer-facing → EN/BG only, never Ukrainian.
 *
 * Flow:
 *   1. GET  /api/customer-auth/validate-invite?token=...   → {valid, email, name}
 *   2. POST /api/customer-auth/accept-invite { token, password } → live session
 *
 * On success: stores the session token in localStorage (same keys as the main
 * login flow) and redirects to the customer cabinet — the client is now a
 * full member of the system.
 */
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Lock,
  Eye,
  EyeSlash,
  CheckCircle,
  SpinnerGap,
  ArrowLeft,
  WarningCircle,
  Sparkle,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useLang } from '../../i18n';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const STR = {
  en: {
    backToLogin: 'Back to sign in',
    validating: 'Checking your invitation\u2026',
    invalidTitle: 'Invitation is not valid',
    invalidBody:
      'This invitation is incorrect, expired, or has already been used. Please contact your BIBI Cars manager for a new one.',
    goToLogin: 'Go to sign in',
    kicker: "You're invited",
    title: 'Activate your cabinet',
    accountLabel: 'Account:',
    genericIntro: 'Set a password to activate your BIBI Cars cabinet.',
    welcome: 'Welcome',
    intro:
      'Set a password below to activate your account. After that you can track your order, sign contracts, view invoices and follow your car from auction to keys.',
    newPassword: 'Create password',
    repeatPassword: 'Repeat password',
    mismatch: 'Passwords do not match',
    minLengthError: 'Password must be at least 6 characters',
    submit: 'Activate & sign in',
    submitting: 'Activating\u2026',
    genericError: 'Could not activate your account',
    successTitle: 'Account activated',
    successSub: 'Taking you to your cabinet\u2026',
    loggedIn: 'Welcome to BIBI Cars \u2014 you are signed in',
  },
  bg: {
    backToLogin: 'Към входа',
    validating: 'Проверка на поканата…',
    invalidTitle: 'Невалидна покана',
    invalidBody:
      'Тази покана е неправилна, изтекла или вече е използвана. Моля, свържете се с вашия мениджър в BIBI Cars за нова.',
    goToLogin: 'Към входа',
    kicker: 'Поканени сте',
    title: 'Активирайте кабинета си',
    accountLabel: 'Акаунт:',
    genericIntro: 'Задайте парола, за да активирате кабинета си в BIBI Cars.',
    welcome: 'Добре дошли',
    intro:
      'Задайте парола по-долу, за да активирате акаунта си. След това можете да следите поръчката си, да подписвате договори, да виждате фактури и да проследявате автомобила си от търга до ключовете.',
    newPassword: 'Създайте парола',
    repeatPassword: 'Повторете паролата',
    mismatch: 'Паролите не съвпадат',
    minLengthError: 'Паролата трябва да съдържа поне 6 символа',
    submit: 'Активирай и влез',
    submitting: 'Активиране…',
    genericError: 'Акаунтът не беше активиран',
    successTitle: 'Акаунтът е активиран',
    successSub: 'Пренасочване към кабинета…',
    loggedIn: 'Добре дошли в BIBI Cars — вече сте влезли',
  },
};
const pick = (lang) => (lang === 'bg' ? STR.bg : STR.en);

export default function InviteAcceptPage() {
  const { lang } = useLang();
  const t = pick(lang);

  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [valid, setValid] = useState(null); // null=loading, false=invalid, {email,name}=ok
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setValid(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(
          `${API_URL}/api/customer-auth/validate-invite`,
          { params: { token } }
        );
        if (!cancelled) {
          setValid(res.data && res.data.valid ? res.data : false);
        }
      } catch (e) {
        if (!cancelled) setValid(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (pwd.length < 6) {
      toast.error(t.minLengthError);
      return;
    }
    if (pwd !== pwd2) {
      toast.error(t.mismatch);
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/customer-auth/accept-invite`,
        { token, password: pwd }
      );
      const data = res.data || {};
      const sess = data.sessionToken || data.accessToken || data.token;
      const cid = data.customerId || data.user?.customerId || data.user?.id;
      if (sess) {
        // Canonical session store read by lib/api.js + the cabinet, plus the
        // legacy token key used by the /customer-auth/me fallback.
        localStorage.setItem('customer_session', JSON.stringify({ ...data, sessionToken: sess }));
        localStorage.setItem('customer_token', sess);
        localStorage.setItem('customer', JSON.stringify(data.user || {}));
      }
      setDone(true);
      toast.success(t.loggedIn);
      // Hard navigation so the customer auth context re-bootstraps from the
      // freshly-stored session (client-side routing keeps a stale context and
      // the cabinet route guard would bounce to login).
      setTimeout(() => {
        window.location.href = cid ? `/cabinet/${cid}` : '/cabinet';
      }, 1400);
    } catch (err) {
      toast.error(err.response?.data?.detail || t.genericError);
    } finally {
      setSubmitting(false);
    }
  };

  if (valid === null) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] text-white flex items-center justify-center">
        <div className="text-center">
          <SpinnerGap size={32} className="animate-spin text-[#FEAE00] mx-auto mb-3" />
          <div className="text-white/60 text-sm">{t.validating}</div>
        </div>
      </div>
    );
  }

  if (valid === false) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] text-white flex items-center justify-center p-4">
        <div
          className="w-full max-w-md bg-[#18181B] border border-[#2a2a2e] rounded-2xl p-7 text-center"
          data-testid="invite-invalid"
        >
          <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
            <WarningCircle size={22} weight="fill" />
          </div>
          <h1 className="text-[22px] font-bold mb-2">{t.invalidTitle}</h1>
          <p className="text-white/60 text-sm mb-5">{t.invalidBody}</p>
          <Link
            to="/cabinet/login"
            className="inline-block w-full h-[50px] leading-[50px] bg-[#FEAE00] hover:bg-[#FFBF2D] text-black rounded-md font-extrabold text-[13px] tracking-[0.06em] uppercase"
            data-testid="invite-goto-login"
          >
            {t.goToLogin}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          to="/cabinet/login"
          className="inline-flex items-center gap-2 text-white/60 hover:text-[#FEAE00] text-sm mb-6"
        >
          <ArrowLeft size={16} /> {t.backToLogin}
        </Link>

        <div className="text-center mb-6">
          <span className="font-extrabold text-[26px] tracking-[2px]">
            BIBI<span className="text-[#FEAE00]">CARS</span>
          </span>
        </div>

        <div className="bg-[#18181B] border border-[#2a2a2e] rounded-2xl p-7 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-[#FEAE00] text-black flex items-center justify-center mb-4">
            <Sparkle size={22} weight="fill" />
          </div>
          <p className="text-[11px] font-bold text-[#FEAE00] uppercase tracking-[0.16em] mb-1">
            {t.kicker}
          </p>
          <h1 className="text-[22px] font-bold mb-1">
            {valid.name ? `${t.welcome}, ${valid.name}!` : t.title}
          </h1>
          <p className="text-white/60 text-sm mb-2">{t.intro}</p>
          {valid.email && (
            <p className="text-white/50 text-sm mb-5">
              {t.accountLabel}{' '}
              <span className="text-[#FEAE00]">{valid.email}</span>
            </p>
          )}

          {done ? (
            <div
              className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-center mt-4"
              data-testid="invite-success"
            >
              <CheckCircle
                size={28}
                weight="fill"
                className="text-emerald-400 mx-auto mb-2"
              />
              <div className="font-semibold text-emerald-300">{t.successTitle}</div>
              <div className="text-white/60 text-sm mt-1">{t.successSub}</div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4 mt-4" data-testid="invite-form">
              <div>
                <label className="block text-[11px] font-bold text-[#FEAE00] uppercase tracking-[0.12em] mb-2">
                  {t.newPassword}
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#FEAE00]/80"
                  />
                  <input
                    type={show ? 'text' : 'password'}
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                    minLength={6}
                    required
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full h-[50px] bg-black/40 border border-white/10 rounded-md pl-11 pr-11 text-white placeholder-white/30 focus:outline-none focus:border-[#FEAE00]"
                    data-testid="invite-pwd-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-[#FEAE00] p-1"
                    tabIndex={-1}
                  >
                    {show ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#FEAE00] uppercase tracking-[0.12em] mb-2">
                  {t.repeatPassword}
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#FEAE00]/80"
                  />
                  <input
                    type={show ? 'text' : 'password'}
                    value={pwd2}
                    onChange={(e) => setPwd2(e.target.value)}
                    minLength={6}
                    required
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full h-[50px] bg-black/40 border border-white/10 rounded-md pl-11 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-[#FEAE00]"
                    data-testid="invite-pwd2-input"
                  />
                </div>
                {pwd2 && pwd !== pwd2 && (
                  <p className="text-[11px] text-red-400 mt-1">{t.mismatch}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || !pwd || pwd !== pwd2}
                className="w-full h-[52px] bg-[#FEAE00] hover:bg-[#FFBF2D] text-black rounded-md font-extrabold text-[14px] tracking-[0.06em] uppercase disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="invite-submit-btn"
              >
                {submitting ? (
                  <>
                    <SpinnerGap size={18} className="animate-spin" /> {t.submitting}
                  </>
                ) : (
                  t.submit
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
