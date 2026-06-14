# ROTATION RUNBOOK — BIBI Cars (PHASE SECURITY S3.4)

> **Do not execute on the shared PROD/PREVIEW MongoDB without a maintenance
> window.** Each section is ordered so the running app keeps working. Rotate the
> secrets below because their *current* values exist in git history.

General rule: **add new secret → deploy/restart → verify → revoke old secret.**

---

## 1. Stripe — webhook secret (`whsec_…`)  [HIGH]
Current value is in git history (`memory/stripe_webhook.txt`) and DB.

1. Stripe Dashboard → Developers → Webhooks → the prod endpoint
   (`/api/stripe/webhook`) → **Roll secret** (or recreate the endpoint).
2. Update DB (admin UI `/admin/payments` or `/admin/integrations` → Stripe →
   Webhook Secret). The repo script also exists:
   `python backend/scripts/setup_stripe_webhook.py --domain https://bibicars.org`.
3. Confirm `integration_configs.stripe.webhookSecret` **and** `webhookSecrets[]`
   hold the NEW value; remove the stale entry from `webhookSecrets[]`.
4. Send a Stripe test event → verify `200` + signature check passes
   (`server.py` stripe_webhook).
5. Delete the on-disk `memory/stripe_webhook.txt` (already git-untracked).

## 2. Stripe — API keys (`sk_/rk_`)  [when going live]
Currently **test** keys — rotate when switching to live:
1. Dashboard → API keys → create **restricted key** (least privilege) for the app.
2. Save into DB (`stripe.secretKey` / `restrictedKey`) via admin UI (values are
   masked on read; saving a non-masked value replaces them).
3. Verify a checkout session + a payment intent succeed.
4. Revoke the previous keys in the Dashboard.

## 3. Resend — API key (`re_…`)  [HIGH]
Current value is in git history (`notifications.py`).
1. Resend Dashboard → API Keys → **Create** a new key (sending scope).
2. Save into DB (`integration_configs.resend.apiKey`) via `/admin/integrations`
   **or** set `RESEND_API_KEY` in the prod env. (Source no longer hardcodes it.)
3. Send a test email (e.g. trigger OTP) → verify `email_outbox.status = sent`.
4. **Delete** the old key in the Resend Dashboard.

## 4. JWT signing secret  [HIGH — invalidates all sessions]
Current value committed as `backend/.jwt_secret`.
1. Pick a maintenance window (all staff/customers will be logged out).
2. Preferred: set `JWT_SECRET=<64+ random chars>` in the prod env, then restart.
   - Generate: `python -c "import secrets;print(secrets.token_urlsafe(64))"`.
3. Alternative (auto-gen): `rm backend/.jwt_secret` then restart → a fresh secret
   is generated + persisted (`0600`).
4. Verify: old tokens now `401`; fresh login issues a working token.

## 5. Google OAuth  [only if a clientSecret is ever added]
- Today only a non-secret `clientId` is stored — nothing to rotate.
- If a `clientSecret` is introduced: Google Cloud Console → Credentials →
  reset secret → update DB (`google_oauth.clientSecret`) → re-test sign-in →
  revoke old.

## 6. EXT_SHARED_SECRET (extension HMAC)  [coordinate with extension]
1. Generate a new secret; set `EXT_SHARED_SECRET` in the prod env.
2. Ship the matching secret to the browser-extension/worker build.
3. Restart backend; verify `/api/ext/heartbeat` + `/api/ext/jobs` authenticate
   (HMAC ok). **Both sides must change together** or the extension breaks.

## 7. Staff passwords (admin/manager/team_lead)  [HIGH]
**Code is already fixed** — passwords are no longer in `server.py`; they are read
from env (`BIBI_ADMIN_PASSWORD` / `BIBI_MANAGER_PASSWORD` / `BIBI_TEAM_LEAD_PASSWORD`)
and currently hold the SAME values in the gitignored `.env`. The values still
exist in **git history**, so rotate them:
1. Generate strong, unique new passwords for each role.
2. Set the new values in the **prod** env (`BIBI_*_PASSWORD`); update PREVIEW `.env`
   too if you want both environments aligned (shared DB → the boot force-sync will
   update the stored hash to the new value).
3. Restart → verify each role logs in with the NEW password; OLD ones fail.
4. Update `memory/test_credentials.md` (gitignored) with the new values.

## 8. Customer seed passwords  [MED]
- `server.py:2889 (User_bibi_2026!)`, `:2896 (test123)` — remove the seed (or
  gate behind a `SEED_DEMO=0` flag) before production; delete demo customers.

---

## After rotation — optional: scrub git history
Once **all** above are rotated (old values are now useless), optionally purge the
historical blobs:
```
git filter-repo --path backend/.jwt_secret --path memory/stripe_webhook.txt --invert-paths
# (or BFG) — then force-push & re-clone. Coordinate with all collaborators.
```
History scrubbing is **not** a substitute for rotation — rotate first.
