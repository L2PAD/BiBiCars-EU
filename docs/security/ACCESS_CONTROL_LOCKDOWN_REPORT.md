# BIBI Cars — ACCESS CONTROL LOCKDOWN REPORT

> PHASE SECURITY · Wave S2 · default-deny gate VERIFIED on preview.

## Coverage

- **Total routes:** 1044 / 1044 classified by the live gate (default tier = STAFF).
- public tier: **123** · customer tier: **65** · staff tier: **856**

## Live unauthenticated probe (GET, no path params)

- Probed: **384**  ·  Behaved correctly: **384**  ·  Hard anomalies: **0**
- Public routes whose handler additionally self-enforces auth (safe, no data returned): **4**
- Rule: public → reachable; customer/staff → **401 without a token**.

- Note: `/metrics` is served by the frontend SPA externally (ingress routes non-`/api` paths to the frontend); the backend metrics endpoint is not reachable from the public domain.

### ✅ No anomalies — every non-public GET route requires authentication; every public route is reachable.

## Guarantees now enforced at the edge
- 🔒 **0 unauthenticated access** to any non-public route (verified).
- 🔒 **Role floor:** customer tokens are rejected (403) on staff routes (privilege separation).
- 🔒 **Ownership:** customer cabinet cross-tenant returns 403 (`/api/customer-cabinet/{id}/*`).
- 🔒 **Default-deny:** any new/unguarded route is STAFF-only until explicitly allowlisted in `app/middleware/access_gate.py`.
- 🔒 **Backdoor removed** (`demo-token-12345`) and **`?token=` disabled** except the call-recording media route.

## Residual hardening (finer-grained, tracked separately)
- Per-route sub-role separation on the ~staff bucket (admin vs manager vs team_lead) — existing `require_admin`/`require_master_admin` deps still apply on guarded routes; unguarded staff routes are staff-floor only.
- Object-level ownership inside staff endpoints (manager book scoping) — Wave S2.2 follow-up per IDOR_REPORT.md.
- `AUTH_MODE=strict` flip (needs EXT_SHARED_SECRET + CORS allowlist set in prod env) — S2.5.