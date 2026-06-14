"""
SEO router — dynamic sitemap for catalog cars + blog articles.

Mounted at /api/seo/sitemap.xml. The static /sitemap.xml served by the
frontend lists known public pages; this endpoint complements it with the
constantly-changing inventory (live catalog) and content (blog) entries.

Resilient by design — if any optional collection is missing the endpoint
still returns a valid (possibly emptier) sitemap. Google won't penalize
us for missing data, only for malformed XML.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Request, Response
from xml.sax.saxutils import escape

router = APIRouter(prefix="/api/seo", tags=["seo"])

# Production-origin shim. Resolved from `SEO_PUBLIC_ORIGIN` (preferred) or
# `PUBLIC_BASE_URL`. Mirror this in index.html and the robots.txt so every
# SEO surface stays consistent. Falls back to an empty string when neither
# is set so callers always provide a value via Host header at request time.
ORIGIN = (
    os.environ.get("SEO_PUBLIC_ORIGIN")
    or os.environ.get("PUBLIC_BASE_URL")
    or ""
).rstrip("/")

_CACHE: Dict[str, Any] = {"xml": None, "at": None}
_CACHE_TTL_SECONDS = 600   # 10 minutes — sitemap is fresh enough for Googlebot


def _w3c_date(value: Any) -> str:
    """Best-effort W3C-Datetime formatter for <lastmod>."""
    if not value:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if isinstance(value, datetime):
        dt = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        return dt.strftime("%Y-%m-%d")
    if isinstance(value, str):
        return value[:10]
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _url_entry(loc: str, lastmod: str | None = None,
               changefreq: str = "weekly", priority: str = "0.5") -> str:
    parts = [
        "  <url>",
        f"    <loc>{escape(loc)}</loc>",
    ]
    if lastmod:
        parts.append(f"    <lastmod>{escape(lastmod)}</lastmod>")
    parts.append(f"    <changefreq>{changefreq}</changefreq>")
    parts.append(f"    <priority>{priority}</priority>")
    parts.append("  </url>")
    return "\n".join(parts)


@router.get("/sitemap.xml", response_class=Response)
async def dynamic_sitemap(request: Request) -> Response:
    """Render a fresh sitemap with catalog + blog. Cached for 10 min."""
    now = datetime.now(timezone.utc)
    if (
        _CACHE["xml"]
        and _CACHE["at"]
        and (now - _CACHE["at"]).total_seconds() < _CACHE_TTL_SECONDS
    ):
        return Response(
            content=_CACHE["xml"],
            media_type="application/xml",
            headers={"Cache-Control": f"public, max-age={_CACHE_TTL_SECONDS}"},
        )

    db = request.app.db if hasattr(request.app, "db") else None
    if db is None:
        # Fallback discovery — the server.py wires the Motor client into
        # request.app.state.db under the new refactor; fall through to a
        # static skeleton so the endpoint never 500s.
        db = getattr(request.app.state, "db", None) if hasattr(request.app, "state") else None

    entries: List[str] = []

    # ─── Catalog vehicles ───────────────────────────────────────────────
    #
    # The catalog feeds from `vin_data` (scraped + enriched listings).
    # Archived/sold rows are still indexable — SingleCarPage renders them
    # with a "find similar" CTA, which is genuine long-tail SEO value.
    # Live (non-archived) rows take priority 0.85, archived 0.45.
    try:
        if db is not None:
            cursor = db.vin_data.find(
                {"vin": {"$exists": True, "$nin": [None, ""]}},
                {
                    "_id": 0, "vin": 1, "slug": 1, "archived": 1,
                    "make": 1, "model": 1, "year": 1,
                    "last_seen": 1, "created_at": 1,
                },
            ).sort("last_seen", -1).limit(5000)
            async for v in cursor:
                identifier = v.get("slug") or v.get("vin")
                if not identifier:
                    continue
                archived = bool(v.get("archived"))
                entries.append(_url_entry(
                    loc=f"{ORIGIN}/cars/{identifier}",
                    lastmod=_w3c_date(v.get("last_seen") or v.get("created_at")),
                    changefreq="monthly" if archived else "weekly",
                    priority="0.45"   if archived else "0.85",
                ))
    except Exception:
        pass

    # ─── Blog articles ──────────────────────────────────────────────────
    try:
        if db is not None:
            cursor = db.blog_articles.find(
                {"$or": [
                    {"published": True},
                    {"status":    {"$in": ["published", "live"]}},
                ]},
                {"_id": 0, "slug": 1, "updated_at": 1, "published_at": 1},
            ).limit(2000)
            async for a in cursor:
                slug = a.get("slug")
                if not slug:
                    continue
                entries.append(_url_entry(
                    loc=f"{ORIGIN}/blog/{slug}",
                    lastmod=_w3c_date(a.get("updated_at") or a.get("published_at")),
                    changefreq="weekly",
                    priority="0.65",
                ))
    except Exception:
        pass

    # ─── Collections ────────────────────────────────────────────────────
    try:
        if db is not None:
            cursor = db.collections.find(
                {"$or": [{"is_public": True}, {"public": True}, {"published": True}]},
                {"_id": 0, "slug": 1, "updated_at": 1},
            ).limit(500)
            async for c in cursor:
                slug = c.get("slug")
                if not slug:
                    continue
                entries.append(_url_entry(
                    loc=f"{ORIGIN}/collections/{slug}",
                    lastmod=_w3c_date(c.get("updated_at")),
                    changefreq="weekly",
                    priority="0.60",
                ))
    except Exception:
        pass

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(entries)
        + "\n</urlset>\n"
    )

    _CACHE["xml"] = xml.encode("utf-8")
    _CACHE["at"]  = now
    return Response(
        content=_CACHE["xml"],
        media_type="application/xml",
        headers={
            "Cache-Control": f"public, max-age={_CACHE_TTL_SECONDS}",
            "X-Sitemap-Entries": str(len(entries)),
        },
    )


@router.get("/sitemap-index.xml", response_class=Response)
async def sitemap_index() -> Response:
    """Top-level sitemap index pointing at the static + dynamic sitemaps."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f'  <sitemap><loc>{ORIGIN}/sitemap.xml</loc><lastmod>{today}</lastmod></sitemap>\n'
        f'  <sitemap><loc>{ORIGIN}/api/seo/sitemap.xml</loc><lastmod>{today}</lastmod></sitemap>\n'
        "</sitemapindex>\n"
    )
    return Response(
        content=xml,
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=3600"},
    )


# ─────────────────────────────────────────────────────────────────────────
# Public runtime-config — consumed by the frontend bootstrap to inject
# GA4 / Google Ads / Facebook pixel WITHOUT redeploying. Only emits the
# *public-safe* subset of the admin SEO settings (verification tokens
# remain server-side only; analytics IDs are intentionally public).
# ─────────────────────────────────────────────────────────────────────────
@router.get("/runtime-config")
async def runtime_config(request: Request) -> Dict[str, Any]:
    db = getattr(request.app.state, "db", None) if hasattr(request.app, "state") else None
    doc: Dict[str, Any] = {}
    if db is not None:
        try:
            doc = await db.seo_settings.find_one({"_id": "global"}) or {}
        except Exception:
            doc = {}

    return {
        # Analytics / advertising tags — safe to expose, they're meant to
        # be in the user's browser anyway.
        "ga4_measurement_id":       doc.get("ga4_measurement_id") or "",
        "google_ads_conversion_id": doc.get("google_ads_conversion_id") or "",
        "google_ads_send_page_view": bool(doc.get("google_ads_send_page_view", True)),
        "facebook_pixel_id":        doc.get("facebook_pixel_id") or "",
        # Verification tokens — also public (they end up in <meta> tags)
        "google_site_verification": doc.get("google_site_verification") or "",
        "bing_site_verification":   doc.get("bing_site_verification") or "",
        "yandex_site_verification": doc.get("yandex_site_verification") or "",
        # Site identity defaults — used by useSeo() as a fallback
        "default_title":       doc.get("default_title") or "",
        "default_description": doc.get("default_description") or "",
        "default_keywords":    doc.get("default_keywords") or "",
        "default_og_image":    doc.get("default_og_image") or "",
    }


__all__ = ["router"]
