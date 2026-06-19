"""
PHASE SECURITY — Wave S2 — Access Control Gate (default-deny)

A single edge that classifies EVERY request into one of three trust tiers and
lets the per-route role guards (require_admin / require_master_admin / ...) do
the finer authorization on top:

    public    → anyone (storefront, auth flows, webhooks, health, public tokens)
    customer  → valid customer session OR staff
    staff     → valid staff token only (DEFAULT — anything not explicitly listed)

This makes the system *default-deny*: a newly added route with no guard is
STAFF-only until someone deliberately allowlists it here. That directly answers
"a future route without a guard must not re-open the hole".

Allowlists were derived from the real frontend surface:
  - public storefront pages  (pages/public/*)
  - customer cabinet          (pages/cabinet/*, CustomerCabinet.js, components/cabinet/*)

`classify_path(path)` is pure (no I/O) so it is trivially testable and is reused
by the verification script (scripts/verify_lockdown.py).
"""
from __future__ import annotations

import re
from typing import List, Pattern

# ── Query-string token (?token=) is DISABLED everywhere EXCEPT this one route ──
# Native <audio> playback of call recordings cannot set an Authorization header.
# Everything else must use `Authorization: Bearer`.
QUERY_TOKEN_ALLOWED: Pattern = re.compile(r"^/api/calls/[^/]+/recording$")


def _compile(patterns: List[str]) -> List[Pattern]:
    return [re.compile(p) for p in patterns]


# ── PUBLIC (no authentication) ───────────────────────────────────────────
_PUBLIC = _compile([
    # root / static / crawler
    r"/",
    r"/favicon\.ico",
    r"/robots\.txt",
    r"/api",
    r"/api/static(/.*)?",
    # health
    r"/api/(health|healthz)",
    r"/api/system/health",
    # staff + customer AUTH entry points (must be reachable without a token)
    r"/api/auth/login",
    r"/api/auth/google-client-id",
    r"/api/auth/password-policy",
    r"/api/auth/2fa/verify",
    r"/api/auth/email-otp/(request|verify)",
    r"/api/customer-auth/(register|login|verify-email|resend-email-code|forgot-password|reset-password|validate-reset-token|validate-invite|accept-invite)",
    r"/api/customer-auth/google/(verify|logout)",
    # Customer 2FA login challenge — pre-auth (no bearer yet, password/Google
    # already verified upstream; protected by a short-lived challenge_token).
    r"/api/customer-auth/2fa/challenge/verify",
    # Stripe inbound + public config
    r"/api/stripe/(webhook|public-config)",
    # CSP (Report-Only) violation sink — browsers POST here without a token
    r"/api/security/csp-report",
    # Public contract view / sign by unguessable token
    r"/api/contracts/view(/.*)?",
    # Public share links
    r"/api/public(/.*)?",
    # SEO / sitemaps / public site content
    r"/api/seo(/.*)?",
    r"/api/seo-clusters/public(/.*)?",
    r"/api/site-info(/.*)?",
    r"/api/settings/public",
    r"/api/services",
    r"/api/legal/(catalog|deal-stages)",
    # Public storefront calculator
    r"/api/calculator/(calculate|quote|ports)(/.*)?",
    r"/api/calculations",
    r"/api/payments/packages",
    # Public catalog
    r"/api/vehicles(/.*)?",
    # Public VIN / vehicle lookups (storefront vehicle pages & VIN check)
    r"/api/vin(/.*)?",
    r"/api/vin-price(/.*)?",
    r"/api/vin-resolver(/.*)?",
    r"/api/vin-unified(/.*)?",
    r"/api/v2/search(/.*)?",
    r"/api/carfax/(?!me$|request$)[^/]+",          # carfax/{vin} but NOT carfax/me|request
    r"/api/autoastat(/.*)?",
    r"/api/bidcars(/.*)?",
    r"/api/statvin/lookup(/.*)?",
    r"/api/bulk/vehicle(/.*)?",
    r"/api/auction/copart(/.*)?",
    # Social/storefront features (self-scoped by token internally; anon-safe)
    r"/api/favorites(/.*)?",
    r"/api/compare(/.*)?",
    r"/api/shares(/.*)?",
    # Public lead capture forms
    r"/api/leads/consultation",
    r"/api/quick-leads",
    r"/api/public/leads(/.*)?",
    # Site-activity tracker (public ingest + script)
    r"/api/v1/site-activity/(tracker\.js|setup)(/.*)?",
    # Public, key-protected telemetry ingest (X-Api-Key) + its CORS preflight.
    # NOTE: only the EXACT ingest path is public — the CRM-read endpoints
    # (/online, /by-entity/*, /{entity_id}) stay staff-only by default.
    r"/api/v1/site-activity/?",
    r"/api/site-activity(/.*)?",
    # Anonymous telemetry beacons (write-only ingest)
    r"/api/analytics/(track|link-session)",
    r"/api/events/track",
    r"/api/track/event",
    # Extension public downloads
    r"/api/extension/(download|info)",
    r"/api/extension/vesselfinder/download",
])

# ── CUSTOMER (valid customer session OR staff) ───────────────────────────
_CUSTOMER = _compile([
    r"/api/customer-auth/(me|logout)(/.*)?",
    r"/api/customer-auth/google/me",
    # Customer 2FA management (requires a valid customer session). The login
    # challenge verify path is PUBLIC (matched above) and excluded here.
    r"/api/customer-auth/2fa/(status|setup|verify|disable|backup/regenerate|email/enable|email/disable)",
    r"/api/customer-cabinet(/.*)?",
    r"/api/customer-portal(/.*)?",
    r"/api/cabinet(/.*)?",
    r"/api/carfax/(me|request)(/.*)?",
    r"/api/contracts/(me|template)(/.*)?",
    r"/api/contracts/[^/]+/(view|sign-with-signature|sign)(/.*)?",
    r"/api/invoices/(me|checkout|create-from-package)(/.*)?",
    r"/api/notifications/customer(/.*)?",
    r"/api/shipping/me(/.*)?",
    r"/api/docusign/envelopes/[^/]+/sign",
    r"/api/vesselfinder/session/status",
    r"/api/stripe/create-checkout-session",
    r"/api/history(/.*)?",
    r"/api/intent/me",
])

# ── EXTENSION (HMAC-signed; no bearer token) ─────────────────────────────
# These are authenticated by `require_extension_hmac` (X-Ext-Signature), NOT a
# bearer token. The gate must let them THROUGH to that dependency rather than
# demanding a bearer (which the extension/worker never sends).
_EXTENSION = _compile([
    r"/api/ext/(heartbeat|jobs|observation|push|register)(/.*)?",
    # Read-only health/registry endpoints — safe to expose so the extension's
    # connectivity probe and the admin panel can read them without a bearer.
    r"/api/ext/(health|clients|degraded|drifting|result)(/.*)?",
    r"/api/vesselfinder/(heartbeat|jobs)(/.*)?",
])

# Paths that hit the backend but are NOT /api — protect docs/metrics as staff.
_STAFF_NON_API = {"/metrics", "/docs", "/redoc", "/openapi.json"}


def classify_path(path: str) -> str:
    """Return 'public' | 'customer' | 'staff' for a request path."""
    p = path or "/"
    # normalise trailing slash (except root)
    if len(p) > 1 and p.endswith("/"):
        p = p.rstrip("/")
        if not p:
            p = "/"
    for pat in _PUBLIC:
        if pat.fullmatch(p):
            return "public"
    for pat in _EXTENSION:
        if pat.fullmatch(p):
            return "extension"
    for pat in _CUSTOMER:
        if pat.fullmatch(p):
            return "customer"
    if p in _STAFF_NON_API:
        return "staff"
    if not p.startswith("/api"):
        # any other backend-served, non-API path → treat as public (assets/probes)
        return "public"
    return "staff"
