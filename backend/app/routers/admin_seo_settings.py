"""
admin_seo_settings.py — /api/admin/seo/settings  (master-admin only)
====================================================================

One-stop SEO control panel, sibling of /api/admin/system/settings.
Lets ПМ АВТО ГРУП ops set runtime-injectable SEO knobs without code
edits or redeploys:

  • verification           — Google Search Console, Bing Webmasters,
                             Yandex Webmaster verification tokens
  • analytics              — Google Analytics 4 measurement ID (G-XXXX)
  • ads                    — Google Ads conversion linker ID (AW-XXXX)
                             + per-event conversion labels
  • social                 — Facebook Pixel ID, optional
  • site_identity          — default OG image override, fallback title
                             pattern, description, default keywords
  • crawler_directives     — toggle whether to block AI crawlers
                             (GPTBot/Claude-Web/CCBot/anthropic-ai)

Storage: a single ``seo_settings`` Mongo document with ``_id="global"``.
A companion public endpoint ``GET /api/seo/runtime-config`` returns the
*safe* subset (no internal flags) so the frontend can inject GA/AW
trackers at runtime without editing index.html.

Why a separate router (and not extending system_settings)?
  • Cleaner blast-radius: SEO mis-config can't lock the team out of the UI
  • Easier read-only surface for the public ``runtime-config`` endpoint
  • Naturally maps to a sidebar entry under "Settings" (master-admin only)
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional, List

from fastapi import APIRouter, Body, Depends, HTTPException

from security import require_master_admin

logger = logging.getLogger("bibi.admin_seo_settings")

router = APIRouter(prefix="/api/admin/seo", tags=["admin-seo"])

DOC_ID = "global"

DEFAULT_DOC: Dict[str, Any] = {
    "_id": DOC_ID,
    # ─── Search-engine verification tokens (paste from console screens) ──
    "google_site_verification": "",
    "bing_site_verification":   "",
    "yandex_site_verification": "",
    # ─── Analytics & advertising IDs ─────────────────────────────────────
    "ga4_measurement_id":       "",   # e.g. "G-XXXXXXXXXX"
    "google_ads_conversion_id": "",   # e.g. "AW-XXXXXXXXX"
    "google_ads_send_page_view": True,
    "google_ads_conversion_labels": {
        "lead_submit":   "",
        "vin_search":    "",
        "calc_used":     "",
        "contract_signed": "",
    },
    "facebook_pixel_id":        "",
    # ─── Site identity overrides ─────────────────────────────────────────
    "default_title":         "BIBI Cars — Pre-owned car import from US & Korea to Bulgaria",
    "default_description":   "BIBI Cars — auction-to-keys car import platform. Live calculator, VIN check, customs handling and door-to-door delivery of pre-owned vehicles from the United States and South Korea to Bulgaria.",
    "default_keywords":      "car import bulgaria, used cars bulgaria, copart bulgaria, encar bulgaria, vehicle import calculator, vin check bulgaria",
    "default_og_image":      "/og-image.png",
    # ─── Crawler directives ──────────────────────────────────────────────
    "block_ai_crawlers":     True,    # GPTBot, anthropic-ai, Claude-Web, CCBot
    # ─── Metadata ────────────────────────────────────────────────────────
    "updated_at": None,
    "updated_by": None,
}

# ─── Validators ─────────────────────────────────────────────────────────
_GA4_RE  = re.compile(r"^G-[A-Z0-9]{6,12}$")
_AW_RE   = re.compile(r"^AW-\d{6,12}$")
_FBPX_RE = re.compile(r"^\d{8,20}$")
_VERIF_RE = re.compile(r"^[A-Za-z0-9_\-=]{8,200}$")


def _db():
    from app.core.db_runtime import get_db
    return get_db()


async def _load() -> Dict[str, Any]:
    doc = await _db().seo_settings.find_one({"_id": DOC_ID})
    if not doc:
        return {k: v for k, v in DEFAULT_DOC.items() if k != "_id"}
    out = {**{k: v for k, v in DEFAULT_DOC.items() if k != "_id"}, **doc}
    out.pop("_id", None)
    if isinstance(out.get("updated_at"), datetime):
        out["updated_at"] = out["updated_at"].isoformat()
    return out


def _safe_token(value: Any) -> str:
    """Normalize a verification token: trim + drop leading 'content=' / quotes."""
    s = str(value or "").strip()
    s = s.strip('"').strip("'")
    # If user pasted the whole meta tag, extract the content attribute.
    m = re.search(r'content\s*=\s*"([^"]+)"', s) or re.search(r"content\s*=\s*'([^']+)'", s)
    if m:
        s = m.group(1)
    return s


# ═════════════════════════════════════════════════════════════════════════
# ADMIN ENDPOINTS (master_admin only)
# ═════════════════════════════════════════════════════════════════════════
@router.get("/settings", dependencies=[Depends(require_master_admin)])
async def get_seo_settings():
    """Return current SEO settings + helper hints for the UI."""
    return {
        "settings": await _load(),
        "hints": {
            "ga4_format":  "G-XXXXXXXXXX  (10-char alphanumeric, find it in Analytics → Admin → Data Streams)",
            "ads_format":  "AW-XXXXXXXXX  (9-10 digit ID, find it in Google Ads → Tools → Conversions)",
            "verification_help": "Paste either the raw token or the full <meta…> tag — we will extract the value automatically.",
        },
    }


@router.patch("/settings", dependencies=[Depends(require_master_admin)])
async def update_seo_settings(
    data: Dict[str, Any] = Body(default={}),
    current_user: Dict[str, Any] = Depends(require_master_admin),
):
    """Upsert one or more SEO fields.

    Strict-but-friendly validation: invalid formats are rejected with a 422
    that names the field, so the UI can highlight it inline.
    """
    update: Dict[str, Any] = {}

    # Verification tokens
    for key in ("google_site_verification", "bing_site_verification", "yandex_site_verification"):
        if key in data:
            tok = _safe_token(data[key])
            if tok and not _VERIF_RE.match(tok):
                raise HTTPException(422, f"{key}: token contains invalid characters or is too short/long")
            update[key] = tok

    # Analytics / advertising
    if "ga4_measurement_id" in data:
        v = (data["ga4_measurement_id"] or "").strip().upper()
        if v and not _GA4_RE.match(v):
            raise HTTPException(422, "ga4_measurement_id: expected format G-XXXXXXXXXX")
        update["ga4_measurement_id"] = v

    if "google_ads_conversion_id" in data:
        v = (data["google_ads_conversion_id"] or "").strip().upper()
        if v and not _AW_RE.match(v):
            raise HTTPException(422, "google_ads_conversion_id: expected format AW-XXXXXXXXX")
        update["google_ads_conversion_id"] = v

    if "google_ads_send_page_view" in data:
        update["google_ads_send_page_view"] = bool(data["google_ads_send_page_view"])

    if "google_ads_conversion_labels" in data:
        labels = data["google_ads_conversion_labels"] or {}
        if not isinstance(labels, dict):
            raise HTTPException(422, "google_ads_conversion_labels must be an object")
        # Just trim — labels are arbitrary opaque strings from Google
        update["google_ads_conversion_labels"] = {
            k: str(v or "").strip() for k, v in labels.items() if isinstance(k, str)
        }

    if "facebook_pixel_id" in data:
        v = (data["facebook_pixel_id"] or "").strip()
        if v and not _FBPX_RE.match(v):
            raise HTTPException(422, "facebook_pixel_id: expected 8-20 digit ID")
        update["facebook_pixel_id"] = v

    # Site identity (length sanity)
    if "default_title" in data:
        v = (data["default_title"] or "").strip()
        if v and len(v) > 200:
            raise HTTPException(422, "default_title is too long (max 200 chars)")
        update["default_title"] = v

    if "default_description" in data:
        v = (data["default_description"] or "").strip()
        if v and len(v) > 320:
            raise HTTPException(422, "default_description is too long (max 320 chars)")
        update["default_description"] = v

    if "default_keywords" in data:
        v = (data["default_keywords"] or "").strip()
        if v and len(v) > 500:
            raise HTTPException(422, "default_keywords is too long (max 500 chars)")
        update["default_keywords"] = v

    if "default_og_image" in data:
        v = (data["default_og_image"] or "").strip()
        if v and not (v.startswith("/") or v.startswith("http://") or v.startswith("https://")):
            raise HTTPException(422, "default_og_image must be an absolute URL or start with /")
        update["default_og_image"] = v

    # Crawler directives
    if "block_ai_crawlers" in data:
        update["block_ai_crawlers"] = bool(data["block_ai_crawlers"])

    if not update:
        raise HTTPException(400, "No valid fields supplied")

    # Audit trail
    update["updated_at"] = datetime.now(timezone.utc)
    update["updated_by"] = current_user.get("email") or current_user.get("id")

    await _db().seo_settings.update_one(
        {"_id": DOC_ID},
        {"$set": update, "$setOnInsert": {"_id": DOC_ID}},
        upsert=True,
    )

    logger.info("[seo] settings updated by %s: keys=%s",
                update["updated_by"], list(update.keys()))

    return {
        "success":  True,
        "settings": await _load(),
        "message":  "SEO settings saved — taking effect on next page load.",
    }


__all__ = ["router"]
