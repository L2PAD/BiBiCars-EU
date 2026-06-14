# BIBI Cars — SECURITY MATRIX

> **Phase:** PHASE SECURITY · **Wave S1 · Stage 1**
> **Scope:** Full pre-handover security audit (no new features).
> **Date:** 2026-06-13 · **Auditor:** Security architect (automated + manual probing)
> **Environments:** Preview (dev) shares the **same MongoDB** as Production (`https://bibicars.org`). Any data leak on preview ⇒ identical leak on prod.

---

## 0. Executive Summary (RU)

Аудит выявил **системную проблему Broken Access Control (OWASP A01)** — это самый критичный класс уязвимостей для CRM. Подтверждено **на живом окружении**, без всякой аутентификации:

| Что утекает | Endpoint | Доказательство |
|---|---|---|
| **Полный owner/admin дашборд** | `GET /api/dashboard/master` | 200 + реальные SLA/метрики из Mongo |
| Owner risk-дашборд | `GET /api/owner-dashboard` | 200 + risk/people |
| Внутренности системы/парсеров | `GET /api/control/overview` | 200 + источники, extension-клиенты |
| Сделки (агрегаты) | `GET /api/deals/stats` | 200 `{total:8,...}` |
| Аналитика инвойсов | `GET /api/invoices/analytics` | 200 `{total:14, paid:5...}` |
| **Данные заказов клиента** | `GET /api/cabinet/orders` | 200 + customerId, VIN, цены, имена |
| Уведомления клиентов | `GET /api/notifications` | 200 + текст сообщений клиента |
| Admin-статистика калькулятора | `GET /api/calculator/admin/stats` | 200 |

Дополнительно подтверждён **хардкод-бэкдор**: токен `demo-token-12345` (env `AUTH_MODE` по умолчанию = `legacy`) даёт **полный доступ owner** к admin-эндпоинтам (`HTTP 200`), в т.ч. через query-параметр `?token=`.

**Вывод:** проект функционально готов, но **НЕ готов к передаче** до закрытия Access Control / Auth. Это и есть приоритет Wave S1→S2.

---

## 1. Methodology

1. **Route introspection** — imported the assembled FastAPI app and walked every `APIRoute`, collecting the auth dependency wired into each route (`scripts/audit_routes.py`). Result: **1044 routes**.
2. **Guard classification** — mapped each route to its strongest guard dependency.
3. **Active probing** — sent **unauthenticated** requests to every unguarded `GET` route without path params and inspected response bodies for real data exposure.
4. **Backdoor verification** — tested the legacy/static tokens against admin endpoints on the live preview.
5. **Code review** — `security.py` (JWT/roles/tokens), customer-auth flow, representative leaking endpoints.

### Route guard distribution (1044 routes)

| Guard | Count | Meaning |
|---|---:|---|
| `UNGUARDED` (no `Depends`) | **375** | No dependency-level auth. Some do *manual* `_resolve_bearer`, many are genuine holes. |
| `require_admin` | 227 | owner/master_admin/admin **+ team_lead** |
| `require_user` (any staff) | 187 | any valid staff JWT |
| `require_manager_or_admin` | 173 | staff roles |
| `require_master_admin` | 65 | owner/master_admin/admin/**team_lead** rolesets vary |
| `optional_user` | 9 | auth optional |
| `require_extension_hmac` | 8 | HMAC-signed extension |

> ⚠️ The 375 "unguarded" figure overstates *intended* public routes because ~17 endpoints authenticate manually via `Header(authorization)` + `_resolve_bearer`. But active probing proved **many unguarded routes leak real data** (see §3).

---

## 2. Authentication Architecture — findings

| # | Finding | Severity | Evidence / Detail |
|---|---|---|---|
| A-1 | **Hardcoded backdoor token** `demo-token-12345` grants `role=owner` | 🔴 CRITICAL | `security.py:125 LEGACY_DEMO_TOKEN`; live `GET /api/admin/integrations` → 200 with this token. Active because `AUTH_MODE` default = `legacy` (`security.py:116`). |
| A-2 | **Token accepted via `?token=` query param** | 🟠 HIGH | `security.py:_extract_token` reads `request.query_params['token']`. Leaks into access logs, browser history, Referer headers. |
| A-3 | `AUTH_MODE=disabled` opens **every** endpoint as `owner` | 🟠 HIGH | `security.py:317/371`. One env flip = full exposure. Needs guardrail + prod assertion. |
| A-4 | **No token revocation / no refresh rotation**; staff JWT TTL 24h, signed HS256 | 🟠 HIGH | `create_jwt` puts role in JWT; logout is client-side only. Can't revoke a leaked/stolen token before expiry. Customer sessions (7d) are revocable (DB), staff JWT are not. |
| A-5 | `team_lead` is in **`ADMIN_ROLES`** | 🟠 HIGH | `security.py:138`. `require_admin` therefore lets team_lead into admin endpoints — violates "team_lead sees only their team". |
| A-6 | JWT secret auto-generated & persisted to `.jwt_secret` file if env unset | 🟡 MEDIUM | `security.py:82-105`. Works, but secret lives on disk; rotation un-documented; multi-replica deploys can diverge. |
| A-7 | `CRM_ADMIN_TOKEN` static server token → `role=owner` | 🟡 MEDIUM | `security.py:288`. Acceptable for server-to-server **iff** strong + secret-managed; currently env-optional, unaudited. |
| A-8 | Customer auth & staff auth are **two separate systems** (DB session token vs JWT) | 🟡 MEDIUM | Increases surface; some cabinet routes rely on manual `_resolve_bearer` — easy to forget on new routes (root cause of §3 leaks). |

---

## 3. Broken Access Control — CONFIRMED live exposures (unauthenticated)

| Endpoint | Data exposed | Severity | Root cause |
|---|---|---|---|
| `GET /api/dashboard/master` | Master/admin dashboard (SLA, metrics from Mongo) | 🔴 CRITICAL | `server.py:5245` no `Depends` guard |
| `GET /api/owner-dashboard` | Risk + people analytics | 🔴 CRITICAL | no guard |
| `GET /api/control/overview` | System internals, parser sources, ext clients | 🔴 CRITICAL | no guard |
| `GET /api/cabinet/orders` | Customer orders: customerId, VIN, lot, prices, names | 🔴 CRITICAL | no guard + **no ownership filter** (IDOR) |
| `GET /api/notifications` | Customer notification content | 🔴 CRITICAL | no guard + no ownership filter |
| `GET /api/deals/stats` | Deal pipeline counts | 🟠 HIGH | no guard |
| `GET /api/invoices/analytics` | Invoice totals/paid/pending | 🟠 HIGH | no guard |
| `GET /api/calculator/admin/stats` | Admin calculator stats | 🟠 HIGH | no guard |
| `GET /api/invoices/overdue` | Overdue invoices | 🟠 HIGH | no guard (200) — verify body |
| `GET /api/login-approval/pending` | Pending login approvals | 🟠 HIGH | no guard (200) |
| `GET /api/calls`, `/api/calls/board`, `/api/calls/analytics` | Call records | 🟠 HIGH | no guard (returned empty unauthenticated — verify with data) |
| `GET /api/escalations`, `/api/documents`, `/api/alerts/critical`, `/api/ext/clients` | CRM/ops data | 🟠 HIGH | no guard (empty unauthenticated — verify) |
| `GET /api/cabinet/{invoices,contracts,deposits,shipping,profile,history-reports}` | Customer cabinet data | 🟠 HIGH | no guard — confirm ownership scoping |

> The **full machine-readable enumeration of all 1044 routes** with guard + probe status is produced in **`ACCESS_CONTROL_REPORT.md`** (Stage 2). IDOR-specific object-access tests in **`IDOR_REPORT.md`** (Stage 3).

---

## 4. Module Risk Matrix

Legend — **Severity:** 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low.
**Status:** ❌ Vulnerable · ⚠️ Partial/Needs review · ✅ OK.

| Module | Risk | Severity | Status | Fix |
|---|---|---|---|---|
| **Auth (staff JWT)** | Backdoor token, query-param token, no revoke/rotation, team_lead=admin | 🔴 | ❌ | Default `AUTH_MODE=strict`; remove `LEGACY_DEMO_TOKEN`; drop `?token=`; add refresh+revoke; split team_lead out of ADMIN_ROLES |
| **Auth (customer)** | Manual `_resolve_bearer` per-route → forgotten guards | 🟠 | ⚠️ | Centralize via `Depends(require_customer)`; never rely on manual checks |
| **Customer Cabinet** | `/api/cabinet/*`, `/api/notifications`, `/api/cabinet/orders` leak w/o auth + no ownership | 🔴 | ❌ | Add `Depends(require_customer)` + enforce `customerId == token.customerId` on every query |
| **Admin / Dashboards** | `dashboard/master`, `owner-dashboard`, `control/overview` open | 🔴 | ❌ | Add `Depends(require_admin)` / `require_master_admin` |
| **Manager** | Manager endpoints not consistently ownership-scoped | 🟠 | ⚠️ | Enforce `managerId` scoping; verify in IDOR audit |
| **Team Lead** | team_lead has admin-level reach (A-5) | 🟠 | ❌ | Dedicated `require_team_lead`; scope to team members only |
| **Payments / Invoices** | `invoices/analytics`, `invoices/overdue` open; ownership on `invoices/me`? | 🔴 | ❌ | Guard + ownership; audit all `/api/invoices/*`, `/api/payments/*` |
| **Contracts** | Public token-view OK by design; verify token entropy + no listing leak | 🟠 | ⚠️ | Confirm token is unguessable, single-purpose, expiring; audit `/api/contracts/*` |
| **Documents / Uploads** | `GET /api/documents` open; upload MIME/ext/size/path not yet hardened | 🔴 | ❌ | Wave S2 Upload Security; guard listing + ownership |
| **Sales / Customer360 / Meetings / Tasks / Leads / Deals** | CRM data under unguarded routes | 🟠 | ❌ | Guard with staff role + ownership; IDOR audit |
| **VIN Engine / Calculator** | Public search OK; `calculator/admin/*` must be admin | 🟠 | ⚠️ | Guard admin sub-routes; rate-limit VIN search |
| **Stripe** | Webhook signature + multi-secret + idempotency present | 🟢 | ✅ | Keep; add replay-window + audit event (verify) |
| **Resend (email)** | Key now in DB/env/fallback; verify not exposed via any GET | 🟡 | ⚠️ | Secrets audit (Wave S3); ensure masked in admin reads |
| **Extension (HMAC)** | HMAC guard exists; `/api/ext/clients` listing reachable | 🟠 | ⚠️ | Ensure all `/api/ext/*` + `/api/admin/ext-clients/*` are master_admin/HMAC |
| **Mongo** | Single shared DB prod+preview; UUID ids (good) | 🟠 | ⚠️ | Separate prod DB OR strict env isolation; backups (Wave S3) |
| **File Storage** | Local path serving? download auth? | 🔴 | ❌ | Store outside web root; auth+ownership on download (Wave S2) |
| **CORS** | Verify not wildcard | 🟠 | ⚠️ | Allowlist only (Wave S2/S3) |
| **Security Headers** | HSTS/CSP/XFO/etc. absent | 🟠 | ❌ | Add middleware (Wave S2) |
| **Rate limiting** | None observed on login/register/reset/upload | 🟠 | ❌ | Add limiter (Wave S2) |
| **Audit logging** | `login_audit`/`audit_events` exist; coverage partial | 🟡 | ⚠️ | Extend to refund/contract/file/role/webhook |
| **Dependencies** | Not yet scanned | 🟡 | ⚠️ | pip-audit/bandit/semgrep/npm audit (Wave S3) |
| **Secrets in repo** | `.env` gitignored; verify no keys in code/logs/git history | 🟠 | ⚠️ | Secrets audit + gitleaks (Wave S3) |

---

## 5. Prioritized Remediation Order (drives Wave S2)

1. **🔴 Kill the backdoor** — default `AUTH_MODE=strict`, remove `LEGACY_DEMO_TOKEN`, drop `?token=` query auth. *(tiny change, removes full-owner backdoor)*
2. **🔴 Guard all leaking endpoints** — add `Depends(require_admin/require_customer/require_*)` to every route in §3; add ownership filters (`customerId`/`managerId`).
3. **🔴 Customer isolation** — centralized `require_customer` dependency; enforce object ownership (IDOR fixes).
4. **🟠 Team-lead role separation** — remove `team_lead` from `ADMIN_ROLES`; scope to team.
5. **🟠 Upload hardening** — MIME+ext whitelist, size limit, path-traversal block, auth'd download, storage outside web root.
6. **🟠 Auth hardening** — short access token + refresh rotation + session revoke + logout-all + httpOnly/secure/sameSite cookies.
7. **🟠 Rate limits** on login/register/reset/upload/vin/contract-sign/webhooks.
8. **🟠 Security headers** (HSTS/CSP/XFO/XCTO/Referrer/Permissions) + **CORS allowlist**.
9. **🟡 Webhook hardening** (idempotency/replay), **audit log** coverage, **secrets/dependency** scans, **infra/backups**.

> ⚠️ **Production impact note:** items 1, 6, and the CORS change can momentarily log users out or break a misconfigured client. They must ship behind preview verification, then a controlled redeploy. Everything in S1 (this matrix + the two reports) is **read-only** and safe.

---

*Generated as part of PHASE SECURITY. Companion artifacts: `ACCESS_CONTROL_REPORT.md`, `IDOR_REPORT.md`, `DEPENDENCY_REPORT.md`, `PENTEST_REPORT.md`, `INFRASTRUCTURE_REPORT.md`.*
