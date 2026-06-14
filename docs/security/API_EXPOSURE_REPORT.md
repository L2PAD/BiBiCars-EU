# API EXPOSURE REPORT — BIBI Cars (PHASE SECURITY S3.4)

Goal: prove no endpoint returns a usable secret (in body or error), and that
secret-typed fields are masked. All probes run live on PREVIEW (strict mode).

## Method
- Public endpoints fetched anonymously.
- Admin endpoints fetched with a valid `admin@bibi.cars` JWT.
- Responses scanned for live patterns: `sk_(live|test)_…{50}`, `rk_…`,
  `whsec_…{20}`, `re_…{16}`, full client secrets, private keys.

## Results

| Endpoint | Auth | Verdict | Notes |
|----------|------|---------|-------|
| `GET /api/stripe/public-config` | public | ✅ PASS | returns only `publishableKey` (`pk_test_…`), `enabled`, `currency`, methods, mode |
| `GET /api/settings/public` | public | ✅ PASS | no secret patterns; 405-byte payload |
| `GET /api/admin/integrations` | admin | ✅ PASS (after fix) | every secret masked → `…<last8>`; **`webhookSecrets[]` now masked** (was leaking full `whsec_` before S3.4) |
| Stripe webhook signature verify | n/a | ✅ | secret only read server-side; unverified events logged, not echoed |

### Masked-field schema (`app/routers/admin_integrations.py`)
| Provider | Masked fields |
|----------|---------------|
| google_oauth | `clientSecret` |
| stripe | `secretKey`, `restrictedKey`, `webhookSecret`, **`webhookSecrets`** |
| email | `smtpPassword` |
| resend | `apiKey`, `resendKey` |
| openai | `apiKey` |
| shipping | `apiKey`, `vesselFinderKey`, `shipsGoKey` |
| sms | `apiKey`, `textbeltKey` |

`publishableKey` / `clientId` are intentionally returned in full (public by design).

## Error-path check
- 401/403/429 responses (access gate + rate limiter) return generic JSON
  (`{"detail": …}`) — no secret material, no stack traces.
- CSP report sink returns `204` with no body.

## Fix applied during this audit
- Added `webhookSecrets` to the stripe secret set + list-aware masking, and made
  the PATCH save preserve masked lists (so the UI round-trip can't overwrite the
  stored secret with `…` placeholders). Re-verified: `webhookSecrets: ['…i8R9kywX']`.

## Conclusion
No endpoint exposes a usable secret. The single exposure (`webhookSecrets[]`) was
found and fixed within this wave; re-test confirms masking.
