# PRODUCTION DEPLOYMENT CHECKLIST — BIBI Cars (no-degradation guarantee)

> Symptom seen: after redeploy, **bibicars.org is missing auth logic (Google/Gmail
> sign-in)** and features that existed before the security phase. Preview has
> everything and works. Code is committed to `main` (HEAD `06d5fee`) and passed
> the deployment readiness scan → **this is a deploy/config issue, not a code bug.**

## Why "works in preview, broken in prod" happens here
`backend/.env` and `frontend/.env` are **gitignored** — they do **NOT** travel with
the deployment. The production environment variables must be configured in the
Emergent deployment settings. If they are missing/wrong, the prod app degrades
even though the code is correct. The three classic causes:

1. **Prod points to a different/empty database** → no `integration_configs`
   (Google OAuth, Stripe, Resend), no data → "nothing we built is there".
2. **Prod CORS doesn't allow `https://bibicars.org`** → browser blocks every API
   call → auth config fetch fails → no Gmail button, "auth logic missing".
3. **Prod frontend built with the wrong `REACT_APP_BACKEND_URL`** (baked at build
   time) → the live site calls the wrong/old backend → auth fails.
4. **Stale build** → the redeploy served an old snapshot instead of current `main`.

## ✅ Verify these in the PRODUCTION deployment env (must match intent)

### Database (MOST LIKELY culprit for "everything missing")
- [ ] `MONGO_URL` — must be the SAME cluster as preview.
- [ ] `DB_NAME` — must be **`test_database`** (same value as preview). If prod uses
      a different DB_NAME it reads an EMPTY database → no Google config, no Stripe,
      no Resend, no data → exactly the reported symptom.

### CORS / URLs
- [ ] `CORS_ORIGINS` — must include `https://bibicars.org` (and `https://www.bibicars.org` if used).
- [ ] frontend `REACT_APP_BACKEND_URL` — must point to the **production backend**
      origin (NOT the preview URL). This is baked into the build → the prod build
      must be produced with this value.
- [ ] `PUBLIC_APP_URL` / `PUBLIC_SITE_URL` / `SEO_PUBLIC_ORIGIN` → `https://bibicars.org`.

### Auth / security
- [ ] `AUTH_MODE=strict`
- [ ] `JWT_SECRET` — **RECOMMENDED: set one strong shared value** in the deployment
      env settings (shared across all replicas, persists across redeploys).
      Suggested value (generated, replace if you prefer your own):
      `JWT_SECRET=50Q5tb3SVzVQOQwxls_FQdJzzZhuzOKQuBt1SDRtZGu5gpnWgkJOCfk0FBV8Zw7PZro-_S0fk0aLn8vC68Hsvg`
      NOTE (hardened 2026-06): if `JWT_SECRET` is NOT set, the backend no longer
      generates a *per-pod local file* secret (the old bug that broke auth under
      `replicas: 2` — each pod had a different key → random 401). Instead
      `security.bootstrap_jwt_secret(db)` resolves a SHARED secret at startup:
      **ENV (primary) → MongoDB `settings._id="jwt_secret"` (shared fallback) →
      generate-once-and-persist-to-Mongo**. So prod self-heals even if ENV is
      missing, but setting `JWT_SECRET` in env is the proper, infra-managed path.
- [ ] `EXT_SHARED_SECRET` — required for the browser-extension HMAC tier.
- [ ] `BIBI_ADMIN_PASSWORD`, `BIBI_MANAGER_PASSWORD`, `BIBI_TEAM_LEAD_PASSWORD` —
      staff passwords now come from env (moved out of source). If prod uses the
      shared DB the hashes already exist, but set these so seeding/force-sync works.
- [ ] `ENVIRONMENT=production` (auto-disables demo seeding) or `SEED_DEMO=false`.

### Google / Gmail login on production (no secret hardcoding)
Google OAuth credentials are read from the DB (per-environment), NOT from source.
Production uses a SEPARATE managed Mongo, so configure it once on prod:
- [ ] Log into prod Admin → **Settings → Auth** (or Integrations → Google) and set
      the Google **Client ID**. This writes `app_settings.auth.google.clientId`,
      which `/api/auth/google-client-id` returns (resolution order:
      `app_settings.auth.google.clientId` → `integration_configs.google_oauth` →
      `GOOGLE_CLIENT_ID` env). API: `PATCH /api/admin/settings/auth`.
- [ ] Alternatively set `GOOGLE_CLIENT_ID` as a prod env var (fallback path).
- [ ] In Google Cloud Console, add the prod domain to **Authorized JavaScript
      origins** / redirect URIs (`https://bibicars.org`).
- [ ] Verify: `GET https://bibicars.org/api/auth/google-client-id` → `{"enabled":true,...}`
      and the "Continue with Google" button appears.

### Integrations (read from shared DB `integration_configs`; verify present)
- [ ] Google OAuth (`GOOGLE_CLIENT_ID` / DB google_oauth) → `/api/auth/google-client-id`
      must return `{"enabled":true, clientId:...}` on prod.
- [ ] Stripe keys (live, when going live), Resend API key + verified domain.

## ✅ Verify the build is the CURRENT version (anti-stale)
- [ ] Redeploy must build from current `main` (HEAD `06d5fee`). Trigger a **fresh**
      redeploy (not a cached one).
- [ ] After deploy, sanity-check on bibicars.org:
  - `GET https://bibicars.org/api/health` → 200
  - `GET https://bibicars.org/api/auth/google-client-id` → `{"enabled":true,...}`
  - Auth page shows the "Continue with Google" button.

## Quick prod smoke (run after each deploy)
```
curl -s https://bibicars.org/api/health
curl -s https://bibicars.org/api/auth/google-client-id        # expect enabled:true
curl -s https://bibicars.org/api/stripe/public-config         # expect publishable key
curl -s -I https://bibicars.org/                              # expect 200 + security headers
```

## If still degraded after the above
The code + DB are correct (verified in preview on the shared DB). A remaining
production-only failure (stale build, env injection, domain/CORS at the edge,
or DB binding) is a **platform/deployment** matter → contact **Emergent Support**
with: the prod URL, the commit being deployed (`06d5fee`), and the curl results above.
