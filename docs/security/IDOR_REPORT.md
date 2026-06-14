# BIBI Cars — IDOR & OBJECT-ACCESS REPORT

> PHASE SECURITY · Wave S1 · Stage 3
> Focus: Insecure Direct Object Reference (OWASP A01) — can a caller read/modify another tenant's objects by changing an ID in the URL? Tested live on preview.

---

## 1. Confirmed results (live evidence)

### 🔴 CRITICAL — `GET /api/customers/{customer_id}/*` — unauthenticated + enumerable
Returns **real financial/PII data with NO token**, `customer_id` directly enumerable.

```
GET /api/customers/test_customer_001/payments   (no Authorization header)
→ 200 {"success":true,"items":[{"paymentIntentId":"pi_test_sim_001","amount":718.0,"paymentStatus":"paid",...}]}

GET /api/customers/test_customer_001/invoices    (no Authorization header)
→ 200 {"success":true,"items":[{"id":"inv_test_customer_001_4","amount":19260,"customerId":"test_customer_001",...}]}
```
**Affected:** `/api/customers/{customer_id}/payments`, `/invoices`, `/orders`, `/finance-summary`.
**Fix:** `Depends(require_user)` (staff only) **AND** if reachable by customers, enforce `customer_id == token.customerId`. These look like staff endpoints → require staff role; never expose to public.

### 🔴 CRITICAL — `GET /api/cabinet/orders` (and siblings) — unauthenticated data
`GET /api/cabinet/orders` returned a real order (customerId `cust_d56ea154ef63`, VIN/lot, prices) with no token. Same pattern likely on `/api/cabinet/{deposits,profile}` which also returned data unauthenticated.
**Fix:** `Depends(require_customer)` + scope every query to `token.customerId`.

### ✅ SAFE — `GET /api/customer-cabinet/{customer_id}/*` — ownership ENFORCED
Best-practice example already present in the codebase:
```
(as customer test_customer_001) GET /api/customer-cabinet/cust_d56ea154ef63/orders
→ 403 {"detail":"Access denied: cabinet belongs to a different customer"}
(no token) → 401 {"detail":"Authentication required"}
```
**Use this pattern as the template** for all other object-access routes.

---

## 2. Object-ID routes WITHOUT a dependency guard (106) — per-route ownership review

These take a sensitive ID/VIN/token in the path and have **no `Depends` guard**. Each must be checked for (a) authentication and (b) ownership/tenant scoping. Grouped by risk:

### 🔴 High-value tenant objects (verify auth + ownership)
- `GET/POST /api/cabinet/deals/{deal_id}/financials`, `/pay-intent`
- `GET /api/customers/{customer_id}/{payments,invoices,orders,finance-summary}` ← **CONFIRMED VULN**
- `GET /api/invoices/{invoice_id}`, `POST /api/invoices/checkout/{invoice_id}`
- `GET /api/deals/{deal_id}`, `GET /api/documents/{document_id}`, `GET /api/history/report/{report_id}`
- `GET /api/leads/{lead_id}`, `DELETE /api/leads/{lead_id}`, `/calls`, `POST /convert`
- `GET /api/tasks/{task_id}`, `GET /api/calls/{call_id}`, `POST /api/calls/{call_id}/outcome`
- `PUT/PATCH/POST /api/escalations/{escalation_id}/*` (reassign/resolve/snooze)
- `GET /api/manager-ai/lead/{lead_id}`, `/user/{user_id}`
- `DELETE /api/notifications/{notification_id}`, `GET /api/meetings/{meeting_id}/ics`
- `GET /api/stripe/session/{session_id}`, `GET /api/docusign/envelopes/{envelope_id}`

### 🟠 Team / routing / config mutations (must be staff/admin)
- `PUT/DELETE/PATCH /api/cadence/definitions/{cadence_id}`, `/runs/{run_id}/stop`
- `PUT/DELETE/PATCH /api/routing/rules/{rule_id}`, `PUT /api/scoring/rules/{rule_id}`
- `PUT /api/notifications/rules/{rule_id}`
- `DELETE /api/calculator/config/{auction-fees,routes}/{id}`, `PATCH /api/calculator/quote/{quote_id}/scenario`
- `POST /api/team/reassignments/{id}/{accept,queue,snooze}`, `/api/team/shipping/{shipment_id}/{create-task,escalate,ping-manager}`, `/api/team/tasks/{task_id}/escalate`
- `GET /api/team/managers/{manager_id}`
- `POST /api/login-approval/{approval_id}`, `POST /api/publishing/{item_id}/{action}`
- `GET/DELETE /api/scrape/job/{job_id}`

### 🟡 Token-scoped / public-by-design (verify token entropy & single-purpose)
- `GET /api/contracts/view/{view_token}` + `/download` + `POST /sign` — **public by design**; verify token is high-entropy, non-enumerable, expiring, and that signing is rate-limited & idempotent.
- `GET /api/public/calculations/share/{share_token}` + `/approve`
- `GET /api/shares/{share_id}`, `DELETE /api/shares/{share_id}` ← deletion must check ownership

### 🟢 VIN / catalog lookups (public-acceptable, but rate-limit)
- `/api/vin/{vin}`, `/api/vin/search/{vin_input}`, `/api/vin-unified/{vin}`, `/api/carfax/{vin}`, `/api/bidcars/*/{vin}`, `/api/autoastat/vehicle/{vin}`, `/api/statvin/lookup/{vin}`, `/api/v2/search/{vin}`, `/api/public/vehicles/{vehicle_id}`, `/api/public/vin/{vin}` — public lookup OK; **add rate limiting** (abuse/cost) and verify no internal cost/margin fields leak.

---

## 3. Recommended fix pattern (uniform)

```python
# 1) Centralized customer dependency (replaces ad-hoc _resolve_bearer)
async def require_customer(authorization: str = Header(None)) -> dict:
    cust = await _resolve_bearer(authorization)
    if not cust:
        raise HTTPException(401, "Authentication required")
    return cust

# 2) Ownership guard on every object route
@router.get("/api/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, cust = Depends(require_customer)):
    inv = await db.invoices.find_one({"id": invoice_id})
    if not inv:
        raise HTTPException(404, "Not found")
    if inv["customerId"] != cust["customerId"]:
        raise HTTPException(403, "Access denied")   # never 404-vs-403 oracle on sensitive data
    return inv

# 3) Staff object routes: require_user + (manager/team scoping)
@router.get("/api/customers/{customer_id}/invoices")
async def cust_invoices(customer_id: str, user = Depends(require_user)):
    # + manager/team_lead scoping: ensure customer is in caller's book
    ...
```

---

## 4. Status

| Area | Result |
|---|---|
| Customer cabinet `/api/customer-cabinet/{id}/*` | ✅ ownership enforced (reference implementation) |
| `/api/customers/{id}/*` staff finance routes | 🔴 unauth + enumerable — **fix now** |
| `/api/cabinet/*` (no-id) | 🔴 unauth data — **fix now** |
| 106 unguarded object-id routes | ⚠️ per-route auth+ownership pass required (Wave S2) |
| Contract/share tokens | ⚠️ verify entropy/expiry/idempotency |
| VIN/catalog lookups | 🟢 public OK, add rate-limit |

> Remediation executed in **Wave S2** (Access Control + Customer Isolation fixes) with preview verification before each production redeploy.
