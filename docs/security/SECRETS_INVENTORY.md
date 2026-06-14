# SECRETS INVENTORY — BIBI Cars (PHASE SECURITY S3.4)

Single source of truth for every secret the system uses: where it lives, whether
it is exposed, and the correct storage location. Values are **masked**.

Legend — Storage: `DB` = `integration_configs`, `ENV` = process env / `.env`,
`DISK` = on-disk file, `CODE` = hardcoded in source (bad), `GITHIST` = present in
git history.

| Secret | Current storage | Correct storage | Exposed? | Status |
|--------|-----------------|-----------------|----------|--------|
| **Resend API key** `re_9c6…epmo` | DB (`resend.apiKey`), ENV (optional) | DB / ENV | API: masked ✅ | was CODE+GITHIST → **removed from source** |
| **Stripe secret key** `sk_test_…VDHl` (test) | DB (`stripe.secretKey`) | DB / ENV | API: masked ✅ | OK (test mode) |
| **Stripe restricted key** `rk_test_…gvI9` (test) | DB (`stripe.restrictedKey`) | DB / ENV | API: masked ✅ | OK |
| **Stripe publishable key** `pk_test_…hmyV` | DB (`stripe.publishableKey`) | DB (public) | public ✅ (by design) | OK — not secret |
| **Stripe webhook secret** `whsec_…kywX` | DB (`stripe.webhookSecret` + `webhookSecrets[]`), DISK `memory/stripe_webhook.txt` | DB / ENV | API: **was leaking via `webhookSecrets[]`** → masked ✅ | GITHIST → file **untracked**; **rotate** |
| **JWT signing secret** (64-byte) | DISK `backend/.jwt_secret` (auto-gen) | ENV `JWT_SECRET` (prod) or DISK 0600 | not exposed | GITHIST → **untracked**; **rotate** (logs users out) |
| **Google OAuth client ID** `31010675…com` | DB (`google_oauth.clientId`) | DB (public) | public-ish ✅ | OK — clientId not secret; **no clientSecret stored** |
| **EXT_SHARED_SECRET** `f69e…` | ENV (`backend/.env`) | ENV | not exposed | OK — env-only |
| **Staff passwords** (admin/manager/team_lead) | ENV (`BIBI_*_PASSWORD` in `.env`) + DB hashes | ENV | hashes only in API | ✅ moved out of source (was CODE+GITHIST); **rotate** at cut-over |
| **Customer seed passwords** `User_bibi_2026!`, `test123` | CODE (gated by `SEED_DEMO`) | remove for prod | n/a | gated OFF on `ENVIRONMENT=production` |
| **Textbelt key** `"textbelt"` | CODE `notifications.py:432` | n/a | n/a | INFO — public free key |
| **MONGO_URL** | ENV (`backend/.env`) | ENV | not exposed | OK |

## Notes
- `.gitignore` now covers: `.env`, `backend/.env`, `frontend/.env`,
  `memory/test_credentials.md`, `memory/stripe_webhook.txt`, `backend/.jwt_secret`,
  `*.jwt_secret`, `credentials.json`, `*.key`.
- API masking schema (`app/routers/admin_integrations.py`): per-provider secret
  fields are replaced with `…<last8>`; list-typed secrets masked element-wise.
- DB resolution priority for Resend/Stripe is **DB → ENV → (optional) ENV fallback**.

## Quick exposure matrix (live-verified)
| Endpoint | Secrets in response? |
|----------|----------------------|
| `GET /api/stripe/public-config` (public) | only `pk_test_…` (publishable) ✅ |
| `GET /api/settings/public` (public) | none ✅ |
| `GET /api/admin/integrations` (admin) | all masked incl. `webhookSecrets[]` ✅ |
