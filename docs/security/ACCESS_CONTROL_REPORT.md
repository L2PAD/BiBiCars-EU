# BIBI Cars — ACCESS CONTROL REPORT

> PHASE SECURITY · Wave S1 · Stage 2 — every route classified by guard; unguarded GET routes probed UNAUTHENTICATED on preview.
> Total routes audited: **1044**

## Guard distribution

| Guard | Routes |
|---|---:|
| `UNGUARDED` | 375 |
| `require_admin` | 227 |
| `require_user` | 187 |
| `require_manager_or_admin` | 173 |
| `require_master_admin` | 65 |
| `optional` | 9 |
| `require_extension_hmac` | 8 |

## 🔴 Unauthenticated data exposure — CONFIRMED (98 routes returned non-trivial data with NO token)

| Status | Bytes | Endpoint |
|---|---:|---|
| 200 | 15177 | `/` |
| 200 | 56 | `/api/agent/ping` |
| 200 | 29 | `/api/alerts` |
| 200 | 8666 | `/api/auction-ranking/ending-soon` |
| 200 | 8666 | `/api/auction-ranking/hot` |
| 200 | 99 | `/api/auction-ranking/stats` |
| 200 | 7423 | `/api/auction-ranking/upcoming` |
| 200 | 41 | `/api/auction/copart/lots` |
| 200 | 102 | `/api/auth/google-client-id` |
| 200 | 405 | `/api/auth/password-policy` |
| 200 | 60 | `/api/autoastat/vehicles` |
| 200 | 1306 | `/api/cabinet/deposits` |
| 200 | 10528 | `/api/cabinet/orders` |
| 200 | 142 | `/api/cabinet/profile` |
| 200 | 515 | `/api/cadence/definitions` |
| 200 | 155 | `/api/cadence/runs` |
| 200 | 171 | `/api/calculator/admin/stats` |
| 200 | 2021 | `/api/calculator/config/eu-delivery-defaults` |
| 200 | 2607 | `/api/calculator/config/ocean-defaults` |
| 200 | 523 | `/api/calculator/config/profile` |
| 200 | 182 | `/api/calculator/config/routes` |
| 200 | 10014 | `/api/calculator/config/usa-inland-defaults` |
| 200 | 1968 | `/api/calculator/ports` |
| 200 | 32 | `/api/calls/analytics` |
| 200 | 1510 | `/api/control/overview` |
| 200 | 76 | `/api/customer-cabinet/dashboard` |
| 200 | 27 | `/api/customer-health-bulk` |
| 200 | 1993 | `/api/dashboard/master` |
| 200 | 100 | `/api/dashboard/stats` |
| 200 | 82 | `/api/deal-engine/evaluate` |
| 200 | 68 | `/api/deals/stats` |
| 200 | 110 | `/api/escalations/stats` |
| 200 | 27 | `/api/ext/drifting` |
| 200 | 1171 | `/api/ext/health` |
| 200 | 52218 | `/api/extension/download` |
| 200 | 1106 | `/api/extension/info` |
| 200 | 22742 | `/api/extension/vesselfinder/download` |
| 200 | 31 | `/api/health` |
| 200 | 31 | `/api/healthz` |
| 200 | 59 | `/api/history/quota/me` |
| 200 | 51 | `/api/intent/me` |
| 200 | 350 | `/api/invoice-reminders/escalation-summary` |
| 200 | 562 | `/api/invoice-reminders/settings` |
| 200 | 105 | `/api/invoices/analytics` |
| 200 | 3747 | `/api/legal/catalog` |
| 200 | 1339 | `/api/legal/deal-stages` |
| 200 | 1026 | `/api/lemon/status` |
| 200 | 3819 | `/api/notifications` |
| 200 | 26 | `/api/notifications/customer/unread-count` |
| 200 | 57 | `/api/notifications/stats` |
| 200 | 126 | `/api/owner-dashboard` |
| 200 | 616 | `/api/parser/circuits` |
| 200 | 307 | `/api/payments/packages` |
| 200 | 13468 | `/api/public/blog/articles` |
| 200 | 2850 | `/api/public/brands` |
| 200 | 6343 | `/api/public/featured` |
| 200 | 84 | `/api/public/google-reviews` |
| 200 | 25344 | `/api/public/vehicles` |
| 200 | 62 | `/api/public/wishlist-deals` |
| 200 | 36 | `/api/publishing/queue` |
| 200 | 83 | `/api/response-time/team` |
| 200 | 67 | `/api/routing/queue/status` |
| 200 | 287 | `/api/routing/rules` |
| 200 | 677 | `/api/scoring/rules` |
| 200 | 53 | `/api/scrape/jobs` |
| 200 | 118 | `/api/scrape/stats` |
| 200 | 40 | `/api/scraped/vehicles` |
| 200 | 532 | `/api/seo-clusters/public` |
| 200 | 287 | `/api/seo/runtime-config` |
| 200 | 278 | `/api/seo/sitemap-index.xml` |
| 200 | 115803 | `/api/seo/sitemap.xml` |
| 200 | 3911 | `/api/services` |
| 200 | 1610 | `/api/settings` |
| 200 | 387 | `/api/settings/public` |
| 200 | 42678 | `/api/shipping/me` |
| 200 | 12419 | `/api/site-info` |
| 200 | 321 | `/api/source-health` |
| 200 | 284 | `/api/statvin/stats` |
| 200 | 380 | `/api/stripe/public-config` |
| 200 | 2282 | `/api/system/health` |
| 200 | 74 | `/api/tasks/stats` |
| 200 | 115 | `/api/team/dashboard` |
| 200 | 4585 | `/api/team/leads` |
| 200 | 620 | `/api/team/managers` |
| 200 | 140 | `/api/team/performance` |
| 200 | 42480 | `/api/team/shipping` |
| 200 | 2062 | `/api/v1/site-activity/setup` |
| 200 | 6485 | `/api/v1/site-activity/tracker.js` |
| 200 | 84 | `/api/v3/config` |
| 200 | 36 | `/api/v3/sessions` |
| 200 | 355 | `/api/v3/stats` |
| 200 | 591 | `/api/vin-service/circuit` |
| 200 | 751 | `/api/vin-service/stats` |
| 200 | 51649 | `/api/vin-unified/list` |
| 200 | 21514 | `/api/vin/search` |
| 200 | 814 | `/api/westmotors/status` |
| 200 | 3353 | `/api/workflow-templates` |
| 200 | 15177 | `/metrics` |

## 🟠 Unguarded but returned empty/trivial unauthenticated (32) — verify ownership scoping / manual auth

| Status | Endpoint |
|---|---|
| 200 | `/api/agent/tasks` |
| 200 | `/api/alerts/critical` |
| 200 | `/api/cabinet/contracts` |
| 200 | `/api/cabinet/history-reports` |
| 200 | `/api/cabinet/invoices` |
| 200 | `/api/cabinet/notifications` |
| 200 | `/api/cabinet/shipping` |
| 200 | `/api/calculator/quotes` |
| 200 | `/api/calls` |
| 200 | `/api/calls/board` |
| 200 | `/api/carfax/me` |
| 200 | `/api/documents` |
| 200 | `/api/documents/queue/pending-verification` |
| 200 | `/api/escalations` |
| 200 | `/api/ext/clients` |
| 200 | `/api/ext/degraded` |
| 200 | `/api/favorites` |
| 200 | `/api/invoice-reminders/critical` |
| 200 | `/api/invoices/me` |
| 200 | `/api/invoices/overdue` |
| 200 | `/api/login-approval/pending` |
| 200 | `/api/notifications/customer/me` |
| 200 | `/api/public/models` |
| 200 | `/api/tasks/active` |
| 200 | `/api/tasks/queue` |
| 200 | `/api/team/alerts` |
| 200 | `/api/team/leads/hot` |
| 200 | `/api/team/leads/stale` |
| 200 | `/api/team/payments/overdue` |
| 200 | `/api/team/reassignments` |
| 200 | `/api/team/shipping/risky` |
| 200 | `/api/team/shipping/stalled` |

## ✅ Unguarded routes that correctly rejected unauthenticated (8) — manual auth present

- 401 `/api/cabinet/deals`
- 401 `/api/compare/me`
- 401 `/api/customer-auth/google/me`
- 401 `/api/customer-auth/me`
- 401 `/api/favorites/me`
- 401 `/api/integrations/ringostat/webhook`
- 401 `/api/notifications/rules`
- 401 `/api/shares/me`

## ⚠️ Unguarded routes WITH path params — manual IDOR review required (119)

- GET `/api/auction-ranking/vehicle/{vehicle_id}`
- GET `/api/autoastat/vehicle/{vin}`
- GET `/api/bidcars/browse/{make}`
- GET `/api/bidcars/search/{vin}`
- GET `/api/bidcars/vehicle/{vin}`
- GET `/api/bulk/vehicle/{vin}`
- GET `/api/cabinet/deals/{deal_id}/financials`
- POST `/api/cabinet/deals/{deal_id}/pay-intent`
- PUT `/api/cadence/definitions/{cadence_id}`
- DELETE `/api/cadence/definitions/{cadence_id}`
- PATCH `/api/cadence/definitions/{cadence_id}/toggle`
- GET `/api/cadence/runs/{run_id}`
- POST `/api/cadence/runs/{run_id}/stop`
- GET `/api/calculator/config/auction-fees/{auction}`
- GET `/api/calculator/config/auction-fees/{code}`
- DELETE `/api/calculator/config/auction-fees/{fee_id}`
- GET `/api/calculator/config/routes/{code}`
- DELETE `/api/calculator/config/routes/{route_id}`
- PATCH `/api/calculator/quote/{quote_id}/scenario`
- GET `/api/calls/{call_id}`
- POST `/api/calls/{call_id}/outcome`
- DELETE `/api/carfast/session/{session_id}`
- GET `/api/carfast/vehicle/{vin}`
- GET `/api/carfax/{vin}`
- DELETE `/api/compare/remove/{vehicle_id}`
- GET `/api/contracts/view/{view_token}`
- GET `/api/contracts/view/{view_token}/download`
- POST `/api/contracts/view/{view_token}/sign`
- GET `/api/copart/vehicle/{lot_number}`
- POST `/api/customer-cabinet/{customer_id}/avatar`
- DELETE `/api/customer-cabinet/{customer_id}/avatar`
- GET `/api/customer-cabinet/{customer_id}/carfax`
- GET `/api/customer-cabinet/{customer_id}/contracts`
- GET `/api/customer-cabinet/{customer_id}/dashboard`
- GET `/api/customer-cabinet/{customer_id}/deposits`
- GET `/api/customer-cabinet/{customer_id}/invoices`
- GET `/api/customer-cabinet/{customer_id}/notifications`
- GET `/api/customer-cabinet/{customer_id}/orders`
- GET `/api/customer-cabinet/{customer_id}/orders`
- GET `/api/customer-cabinet/{customer_id}/orders/{deal_id}`
- GET `/api/customer-cabinet/{customer_id}/profile`
- PATCH `/api/customer-cabinet/{customer_id}/profile`
- GET `/api/customer-cabinet/{customer_id}/requests`
- GET `/api/customer-cabinet/{customer_id}/roadmaps`
- GET `/api/customer-cabinet/{customer_id}/roadmaps/{roadmap_id}`
- GET `/api/customer-cabinet/{customer_id}/shipping`
- GET `/api/customer-cabinet/{customer_id}/timeline`
- GET `/api/customers/{customer_id}/finance-summary`
- GET `/api/customers/{customer_id}/invoices`
- GET `/api/customers/{customer_id}/orders`
- GET `/api/customers/{customer_id}/payments`
- GET `/api/deals/{deal_id}`
- GET `/api/documents/{document_id}`
- GET `/api/docusign/envelopes/{envelope_id}`
- PUT `/api/escalations/{escalation_id}`
- POST `/api/escalations/{escalation_id}/reassign`
- PATCH `/api/escalations/{escalation_id}/resolve`
- POST `/api/escalations/{escalation_id}/resolve`
- POST `/api/escalations/{escalation_id}/snooze`
- GET `/api/ext/observation/{vin}`
- GET `/api/ext/result/{request_id}`
- GET `/api/favorites/check/{vin}`
- POST `/api/favorites/remove/{vin}`
- DELETE `/api/favorites/{vehicle_id}`
- GET `/api/history/report/{report_id}`
- POST `/api/invoices/checkout/{invoice_id}`
- GET `/api/invoices/{invoice_id}`
- GET `/api/leads/{lead_id}`
- DELETE `/api/leads/{lead_id}`
- GET `/api/leads/{lead_id}/calls`
- POST `/api/leads/{lead_id}/convert`
- POST `/api/login-approval/{approval_id}`
- GET `/api/manager-ai/lead/{lead_id}`
- GET `/api/manager-ai/user/{user_id}`
- GET `/api/meetings/{meeting_id}/ics`
- PATCH `/api/notifications/rules/{event_type}`
- PUT `/api/notifications/rules/{rule_id}`
- DELETE `/api/notifications/{notification_id}`
- GET `/api/public/blog/articles/{slug}`
- GET `/api/public/calculations/share/{share_token}`
- POST `/api/public/calculations/share/{share_token}/approve`
- GET `/api/public/search/{query}`
- GET `/api/public/vehicles/{vehicle_id}`
- GET `/api/public/vin/{vin}`
- POST `/api/publishing/bulk/{action}`
- GET `/api/publishing/public/listings/{listing_id}`
- POST `/api/publishing/{item_id}/{action}`
- PUT `/api/routing/rules/{rule_id}`
- DELETE `/api/routing/rules/{rule_id}`
- PATCH `/api/routing/rules/{rule_id}/toggle`
- DELETE `/api/scoring/rules/{rule_code}`
- PATCH `/api/scoring/rules/{rule_code}/toggle`
- PUT `/api/scoring/rules/{rule_id}`
- GET `/api/scrape/job/{job_id}`
- DELETE `/api/scrape/job/{job_id}`
- GET `/api/seo-clusters/public/{slug}`
- GET `/api/shares/{share_id}`
- DELETE `/api/shares/{share_id}`
- GET `/api/site-info/policy/{key}`
- GET `/api/statvin/lookup/{vin}`
- GET `/api/stripe/session/{session_id}`
- GET `/api/tasks/{task_id}`
- GET `/api/team/managers/{manager_id}`
- POST `/api/team/reassignments/{reassignment_id}/accept`
- POST `/api/team/reassignments/{reassignment_id}/queue`
- POST `/api/team/reassignments/{reassignment_id}/snooze`
- POST `/api/team/shipping/{shipment_id}/create-task`
- POST `/api/team/shipping/{shipment_id}/escalate`
- POST `/api/team/shipping/{shipment_id}/ping-manager`
- POST `/api/team/tasks/{task_id}/escalate`
- GET `/api/v2/search/{vin}`
- GET `/api/vin-price/{vin}`
- GET `/api/vin-resolver/{vin}/test`
- GET `/api/vin-unified/{vin}`
- GET `/api/vin/search/{vin_input}`
- GET `/api/vin/status/{search_id}`
- GET `/api/vin/{vin}`
- GET `/api/vin/{vin}/enrich`
- GET `/api/vin/{vin}/shell`

## Guarded route inventory (by guard)

<details><summary><b>require_master_admin</b> (65)</summary>

- PUT `/api/admin/calculator/visibility`
- POST `/api/admin/email-templates`
- PATCH `/api/admin/email-templates/{template_id}`
- POST `/api/admin/ext-clients`
- POST `/api/admin/ext-clients/bootstrap`
- POST `/api/admin/ext-clients/{client_id}/revoke`
- POST `/api/admin/ext-clients/{client_id}/rotate`
- POST `/api/admin/integrations/resend/api-keys`
- DELETE `/api/admin/integrations/resend/api-keys/{key_id}`
- POST `/api/admin/integrations/resend/domains`
- DELETE `/api/admin/integrations/resend/domains/{domain_id}`
- POST `/api/admin/integrations/resend/domains/{domain_id}/verify`
- POST `/api/admin/integrations/resend/webhooks`
- DELETE `/api/admin/integrations/resend/webhooks/{webhook_id}`
- POST `/api/admin/integrations/ringostat/configure`
- PUT `/api/admin/integrations/{integration_id}`
- PATCH `/api/admin/integrations/{provider}`
- POST `/api/admin/integrations/{provider}/toggle`
- PATCH `/api/admin/notification-rules/{event}`
- POST `/api/admin/notifications/email/test`
- POST `/api/admin/notifications/sms/test`
- POST `/api/admin/notifications/test-dispatch`
- POST `/api/admin/payments/{payment_id}/refund`
- POST `/api/admin/ringostat/mappings`
- DELETE `/api/admin/ringostat/mappings/{extension}`
- PATCH `/api/admin/ringostat/settings`
- POST `/api/admin/ringostat/settings/reset`
- GET `/api/admin/seo/settings`
- PATCH `/api/admin/seo/settings`
- POST `/api/admin/services`
- PATCH `/api/admin/services/{service_id}`
- DELETE `/api/admin/services/{service_id}`
- GET `/api/admin/system/settings`
- PATCH `/api/admin/system/settings`
- POST `/api/admin/system/settings/jwt/rotate`
- POST `/api/admin/workflow-templates`
- PATCH `/api/admin/workflow-templates/{tpl_id}`
- DELETE `/api/admin/workflow-templates/{tpl_id}`
- POST `/api/control/debug/probe`
- POST `/api/control/ops/test-alert`
- POST `/api/ingestion/admin/parsers/bitmotors/configure`
- POST `/api/ingestion/admin/parsers/bitmotors/full-sync/cache/clear`
- POST `/api/ingestion/admin/parsers/bitmotors/full-sync/cancel`
- POST `/api/ingestion/admin/parsers/bitmotors/full-sync/configure`
- POST `/api/ingestion/admin/parsers/bitmotors/full-sync/run-now`
- POST `/api/ingestion/admin/parsers/bitmotors/full-sync/scheduler/start`
- POST `/api/ingestion/admin/parsers/bitmotors/full-sync/scheduler/stop`
- POST `/api/ingestion/admin/parsers/bitmotors/incremental/cancel`
- POST `/api/ingestion/admin/parsers/bitmotors/incremental/configure`
- POST `/api/ingestion/admin/parsers/bitmotors/incremental/run-now`
- POST `/api/ingestion/admin/parsers/bitmotors/incremental/scheduler/start`
- POST `/api/ingestion/admin/parsers/bitmotors/incremental/scheduler/stop`
- POST `/api/ingestion/admin/parsers/run-all`
- POST `/api/ingestion/admin/parsers/stop-all`
- POST `/api/ingestion/admin/parsers/westmotors/parse-now`
- POST `/api/ingestion/admin/parsers/westmotors/parser-configure`
- POST `/api/ingestion/admin/parsers/westmotors/parser-start`
- POST `/api/ingestion/admin/parsers/westmotors/parser-stop`
- POST `/api/ingestion/admin/parsers/{source}/circuit-breaker/reset`
- POST `/api/ingestion/admin/parsers/{source}/configure`
- POST `/api/ingestion/admin/parsers/{source}/resume`
- POST `/api/ingestion/admin/parsers/{source}/run`
- POST `/api/ingestion/admin/parsers/{source}/run-once`
- POST `/api/ingestion/admin/parsers/{source}/stop`
- POST `/api/ingestion/admin/promotion/run-once`

</details>

<details><summary><b>require_admin</b> (227)</summary>

- POST `/api/admin/cache/clear`
- GET `/api/admin/calculator/visibility`
- GET `/api/admin/call-flow/board`
- GET `/api/admin/call-flow/due`
- GET `/api/admin/call-flow/session/{session_id}`
- GET `/api/admin/call-flow/stats`
- GET `/api/admin/chrome-extension/download`
- GET `/api/admin/contracts/accounting`
- GET `/api/admin/contracts/export`
- GET `/api/admin/document-templates`
- POST `/api/admin/document-templates`
- POST `/api/admin/document-templates/seed-defaults`
- GET `/api/admin/document-templates/{template_id}`
- PATCH `/api/admin/document-templates/{template_id}`
- DELETE `/api/admin/document-templates/{template_id}`
- GET `/api/admin/email-outbox`
- GET `/api/admin/email-templates`
- GET `/api/admin/ext-clients`
- GET `/api/admin/ext-clients/shared-secret`
- POST `/api/admin/history-reports/abuse-check/{report_id}`
- GET `/api/admin/history-reports/analytics`
- POST `/api/admin/history-reports/approve/{report_id}`
- POST `/api/admin/history-reports/deny/{report_id}`
- GET `/api/admin/history-reports/pending`
- GET `/api/admin/identity/exceptions`
- GET `/api/admin/identity/exceptions/count`
- POST `/api/admin/identity/exceptions/{exc_id}/confirm`
- POST `/api/admin/identity/exceptions/{exc_id}/reject`
- GET `/api/admin/identity/shipments/{shipment_id}`
- POST `/api/admin/identity/shipments/{shipment_id}/resolve`
- POST `/api/admin/identity/shipments/{shipment_id}/transfer-check`
- GET `/api/admin/identity/tracking-status`
- GET `/api/admin/integrations`
- GET `/api/admin/integrations/health`
- GET `/api/admin/integrations/resend/api-keys`
- GET `/api/admin/integrations/resend/domains`
- GET `/api/admin/integrations/resend/domains/{domain_id}`
- GET `/api/admin/integrations/resend/webhook-stats`
- GET `/api/admin/integrations/resend/webhooks`
- GET `/api/admin/integrations/ringostat/config`
- GET `/api/admin/integrations/{integration_id}`
- POST `/api/admin/integrations/{provider}/test`
- GET `/api/admin/intent/analytics`
- GET `/api/admin/intent/hot-leads`
- POST `/api/admin/intent/mark-notified/{lead_id}`
- GET `/api/admin/intent/scores`
- GET `/api/admin/invoice-templates`
- POST `/api/admin/invoice-templates`
- GET `/api/admin/invoice-templates/{tpl_id}`
- PATCH `/api/admin/invoice-templates/{tpl_id}`
- DELETE `/api/admin/invoice-templates/{tpl_id}`
- GET `/api/admin/kpi/alerts`
- GET `/api/admin/kpi/dashboard`
- GET `/api/admin/kpi/leaderboard`
- GET `/api/admin/kpi/team`
- GET `/api/admin/kpi/team-summary`
- GET `/api/admin/login-audit`
- GET `/api/admin/marketing/campaigns`
- POST `/api/admin/marketing/campaigns`
- DELETE `/api/admin/marketing/campaigns/{campaign}`
- GET `/api/admin/metrics`
- GET `/api/admin/notification-rules`
- GET `/api/admin/notifications/channel-status`
- GET `/api/admin/notifications/email/usage`
- GET `/api/admin/observability/events`
- GET `/api/admin/observability/issues`
- GET `/api/admin/orders`
- GET `/api/admin/overview`
- GET `/api/admin/payments`
- GET `/api/admin/payments/recent-events`
- GET `/api/admin/payments/stats`
- POST `/api/admin/payments/sync`
- GET `/api/admin/payments/{payment_id}`
- GET `/api/admin/predictive-leads/bucket/{bucket}`
- GET `/api/admin/providers/stats`
- POST `/api/admin/providers/stats/recompute`
- POST `/api/admin/proxy/add`
- POST `/api/admin/proxy/disable/{proxy_id}`
- POST `/api/admin/proxy/enable/{proxy_id}`
- POST `/api/admin/proxy/priority/{proxy_id}`
- POST `/api/admin/proxy/reload`
- GET `/api/admin/proxy/status`
- POST `/api/admin/proxy/test/{proxy_id}`
- GET `/api/admin/resolver/exceptions`
- GET `/api/admin/resolver/identity/{shipment_id}`
- GET `/api/admin/resolver/queue`
- POST `/api/admin/resolver/run-queue`
- GET `/api/admin/ringostat/callbacks`
- GET `/api/admin/ringostat/calls`
- GET `/api/admin/ringostat/calls/{call_id}`
- GET `/api/admin/ringostat/calls/{call_id}/recording`
- GET `/api/admin/ringostat/events`
- GET `/api/admin/ringostat/health`
- GET `/api/admin/ringostat/mappings`
- GET `/api/admin/ringostat/oversight`
- GET `/api/admin/ringostat/settings`
- GET `/api/admin/ringostat/stats/managers`
- GET `/api/admin/ringostat/stats/overview`
- POST `/api/admin/ringostat/test-connection`
- POST `/api/admin/ringostat/test-webhook`
- GET `/api/admin/ringostat/webhook-info`
- GET `/api/admin/roadmaps`
- GET `/api/admin/roadmaps/stages`
- GET `/api/admin/roadmaps/stages-extended`
- GET `/api/admin/search/analytics`
- POST `/api/admin/security/2fa/disable`
- POST `/api/admin/security/2fa/setup`
- GET `/api/admin/security/2fa/status`
- POST `/api/admin/security/2fa/verify`
- GET `/api/admin/security/daily-reset-config`
- PUT `/api/admin/security/daily-reset-config`
- GET `/api/admin/security/manager-relogins`
- GET `/api/admin/security/pending-otps`
- GET `/api/admin/security/team-lead-otp-config`
- PUT `/api/admin/security/team-lead-otp-config`
- GET `/api/admin/services`
- GET `/api/admin/settings/auth`
- PATCH `/api/admin/settings/auth`
- PUT `/api/admin/settings/legal-policy`
- GET `/api/admin/shipments/exceptions`
- GET `/api/admin/shipments/search`
- POST `/api/admin/shipments/{shipment_id}/resolver/run`
- GET `/api/admin/shipments/{shipment_id}/resolver/status`
- GET `/api/admin/sms-outbox`
- GET `/api/admin/sources`
- POST `/api/admin/sources/recompute`
- GET `/api/admin/sources/{source_id}`
- PUT `/api/admin/sources/{source_id}`
- GET `/api/admin/staff-sessions`
- GET `/api/admin/staff-sessions/active`
- GET `/api/admin/staff-sessions/analytics`
- POST `/api/admin/staff-sessions/force-logout/{session_id}`
- GET `/api/admin/staff-sessions/login-alerts`
- GET `/api/admin/staff-sessions/suspicious`
- POST `/api/admin/tracking/providers/configure`
- POST `/api/admin/tracking/providers/test`
- GET `/api/admin/tracking/status`
- GET `/api/admin/vesselfinder/debug/endpoint-probe`
- GET `/api/admin/vesselfinder/debug/payloads`
- GET `/api/admin/vesselfinder/extension/download`
- GET `/api/admin/workers`
- POST `/api/admin/workers/{name}/restart`
- POST `/api/admin/workers/{name}/start`
- POST `/api/admin/workers/{name}/stop`
- GET `/api/admin/workflow-templates`
- GET `/api/analytics/dashboard`
- GET `/api/analytics/marketing-campaigns`
- POST `/api/bidcars/proxy/parse`
- GET `/api/carfax/admin/analytics`
- GET `/api/carfax/admin/queue`
- POST `/api/contract-lifecycle/{contract_id}/cancel`
- DELETE `/api/customers/{customer_id}`
- GET `/api/debug/db-info`
- GET `/api/debug/full-check`
- POST `/api/debug/ringostat/simulate`
- GET `/api/debug/shipments-count`
- GET `/api/debug/test`
- GET `/api/ingestion/admin/alerts`
- POST `/api/ingestion/admin/alerts/{alert_id}/resolve`
- GET `/api/ingestion/admin/health`
- GET `/api/ingestion/admin/logs`
- GET `/api/ingestion/admin/parsers`
- GET `/api/ingestion/admin/parsers/audit`
- GET `/api/ingestion/admin/parsers/bitmotors/full-sync/status`
- GET `/api/ingestion/admin/parsers/bitmotors/incremental/status`
- GET `/api/ingestion/admin/parsers/bitmotors/settings`
- GET `/api/ingestion/admin/parsers/bitmotors/stats`
- GET `/api/ingestion/admin/parsers/westmotors/parser-stats`
- GET `/api/ingestion/admin/promotion/dashboard`
- GET `/api/ingestion/admin/promotion/stats`
- GET `/api/ingestion/admin/proxies`
- POST `/api/ingestion/admin/proxies`
- POST `/api/ingestion/admin/proxies/test`
- DELETE `/api/ingestion/admin/proxies/{proxy_id}`
- POST `/api/ingestion/admin/proxies/{proxy_id}/disable`
- POST `/api/ingestion/admin/proxies/{proxy_id}/enable`
- POST `/api/ingestion/admin/proxies/{proxy_id}/test`
- GET `/api/ingestion/admin/stabilization/snapshot`
- GET `/api/journey/bottlenecks`
- GET `/api/journey/durations`
- GET `/api/journey/funnel`
- POST `/api/legal/deposits/{deposit_id}/forfeit/admin-finalize`
- POST `/api/legal/deposits/{deposit_id}/forfeit/teamlead-approve`
- POST `/api/legal/deposits/{deposit_id}/refund/approve`
- POST `/api/legal/deposits/{deposit_id}/refund/execute`
- POST `/api/legal/deposits/{deposit_id}/refund/reject`
- POST `/api/legal/payments/{payment_id}/void`
- POST `/api/legal/refund/scan-now`
- GET `/api/lemon/lookup/lot/{lot}`
- GET `/api/lemon/lookup/vin/{vin}`
- GET `/api/lemon/runs`
- POST `/api/lemon/sync/cancel`
- POST `/api/lemon/sync/configure`
- POST `/api/lemon/sync/run-now`
- POST `/api/lemon/sync/scheduler/{action}`
- DELETE `/api/roadmaps/{roadmap_id}`
- GET `/api/shipments/stalled`
- GET `/api/staff`
- POST `/api/staff`
- GET `/api/staff/inactive`
- GET `/api/staff/performance`
- GET `/api/staff/stats`
- GET `/api/staff/teams`
- PUT `/api/staff/{staff_id}`
- GET `/api/staff/{staff_id}`
- DELETE `/api/staff/{staff_id}`
- POST `/api/staff/{staff_id}/reset-password`
- PUT `/api/staff/{staff_id}/toggle-active`
- POST `/api/statvin/cache/clear`
- GET `/api/team-lead/wishlist-deals`
- POST `/api/team-lead/wishlist-deals/approve`
- POST `/api/team-lead/wishlist-deals/reject`
- POST `/api/team-lead/wishlist-deals/{item_id}/approve`
- POST `/api/team-lead/wishlist-deals/{item_id}/reject`
- GET `/api/users`
- GET `/api/users/{user_id}`
- POST `/api/vin-service/cache/clear`
- POST `/api/vin-service/circuit/reset`
- GET `/api/westmotors/lookup/{vin}`
- GET `/api/westmotors/runs`
- POST `/api/westmotors/sync/cancel`
- POST `/api/westmotors/sync/configure`
- POST `/api/westmotors/sync/prefetch`
- POST `/api/westmotors/sync/run-now`
- POST `/api/westmotors/sync/scheduler/start`
- POST `/api/westmotors/sync/scheduler/stop`
- POST `/api/westmotors/sync/warmup`

</details>

<details><summary><b>require_manager_or_admin</b> (173)</summary>

- GET `/api/admin/deals/{deal_id}`
- GET `/api/admin/deals/{deal_id}/health`
- POST `/api/admin/deals/{deal_id}/notes`
- GET `/api/admin/deals/{deal_id}/timeline`
- GET `/api/admin/engagement/analytics`
- GET `/api/admin/engagement/customer/{customer_id}`
- GET `/api/admin/engagement/top-users`
- GET `/api/admin/engagement/top-vehicles`
- GET `/api/admin/engagement/vin-stats`
- POST `/api/admin/invoice-templates/{tpl_id}/preview`
- GET `/api/admin/pipeline/stages`
- GET `/api/admin/settings/legal-policy`
- GET `/api/contract-lifecycle/{contract_id}`
- POST `/api/contract-lifecycle/{contract_id}/archive`
- POST `/api/contract-lifecycle/{contract_id}/send`
- POST `/api/contracts`
- POST `/api/contracts/from-calculator`
- PATCH `/api/contracts/{contract_id}`
- POST `/api/contracts/{contract_id}/amend`
- POST `/api/contracts/{contract_id}/approve`
- POST `/api/contracts/{contract_id}/archive`
- POST `/api/contracts/{contract_id}/attachments`
- DELETE `/api/contracts/{contract_id}/attachments/{att_id}`
- POST `/api/contracts/{contract_id}/reject`
- POST `/api/contracts/{contract_id}/render-pdf`
- POST `/api/contracts/{contract_id}/send`
- POST `/api/contracts2`
- GET `/api/contracts2`
- GET `/api/contracts2/{contract_id}`
- POST `/api/contracts2/{contract_id}/transition`
- POST `/api/contracts2/{contract_id}/upload-signed`
- GET `/api/control/ops/status`
- GET `/api/customers/{customer_id}/comments`
- POST `/api/customers/{customer_id}/comments`
- PATCH `/api/customers/{customer_id}/comments/{comment_id}`
- DELETE `/api/customers/{customer_id}/comments/{comment_id}`
- GET `/api/customers/{customer_id}/contracts`
- POST `/api/customers/{customer_id}/deposits`
- POST `/api/customers/{customer_id}/folders`
- POST `/api/customers/{customer_id}/folders/{folder_id}/upload`
- GET `/api/customers/{customer_id}/generated-documents`
- PUT `/api/customers/{customer_id}/legal`
- GET `/api/customers/{customer_id}/legal`
- GET `/api/customers/{customer_id}/legal/validate`
- GET `/api/customers/{customer_id}/roadmap-indicators`
- GET `/api/customers/{customer_id}/roadmaps`
- POST `/api/customers/{customer_id}/roadmaps`
- GET `/api/customers/{customer_id}/tasks`
- POST `/api/customers/{customer_id}/tasks`
- PATCH `/api/customers/{customer_id}/tasks/{task_id}`
- DELETE `/api/customers/{customer_id}/tasks/{task_id}`
- GET `/api/customers/{customer_id}/timeline`
- GET `/api/deals/{deal_id}/360`
- POST `/api/deals/{deal_id}/advance`
- POST `/api/deals/{deal_id}/blockers`
- DELETE `/api/deals/{deal_id}/blockers/{blocker_id}`
- POST `/api/deals/{deal_id}/deposits`
- POST `/api/deals/{deal_id}/deposits/{deposit_id}/{action}`
- GET `/api/deals/{deal_id}/documents`
- POST `/api/deals/{deal_id}/documents`
- DELETE `/api/deals/{deal_id}/documents/{doc_id}`
- POST `/api/deals/{deal_id}/notes`
- POST `/api/deals/{deal_id}/payments`
- POST `/api/deals/{deal_id}/payments/{payment_id}/{action}`
- GET `/api/deals/{deal_id}/stage-progress`
- POST `/api/deals/{deal_id}/transition`
- GET `/api/deals/{deal_id}/transitions`
- POST `/api/delivery/carriers`
- POST `/api/delivery/shipments`
- POST `/api/delivery/{shipment_id}/carrier`
- POST `/api/delivery/{shipment_id}/documents/upload`
- DELETE `/api/delivery/{shipment_id}/documents/{doc_id}`
- POST `/api/delivery/{shipment_id}/eta`
- POST `/api/delivery/{shipment_id}/milestone`
- GET `/api/deposits`
- PATCH `/api/deposits/{deposit_id}`
- DELETE `/api/deposits/{deposit_id}`
- PUT `/api/deposits/{deposit_id}/approve`
- PUT `/api/deposits/{deposit_id}/reject`
- PATCH `/api/file-manager/files/{file_id}`
- DELETE `/api/file-manager/files/{file_id}`
- PATCH `/api/file-manager/files/{file_id}/move`
- GET `/api/finance/collections`
- GET `/api/finance/managers`
- GET `/api/finance/managers/pnl`
- GET `/api/finance/outstanding`
- GET `/api/finance/overview`
- GET `/api/finance/refunds`
- GET `/api/finance/risk`
- GET `/api/finance/transactions`
- PATCH `/api/folders/{folder_id}`
- DELETE `/api/folders/{folder_id}`
- GET `/api/invoices/manager/my`
- PATCH `/api/invoices/{invoice_id}/cancel`
- POST `/api/invoices/{invoice_id}/contract`
- POST `/api/invoices/{invoice_id}/invoice-pdf`
- PATCH `/api/invoices/{invoice_id}/mark-paid`
- PATCH `/api/invoices/{invoice_id}/send`
- GET `/api/legal/audit`
- POST `/api/legal/deals/{deal_id}/auction/won`
- GET `/api/legal/deals/{deal_id}/audit`
- POST `/api/legal/deals/{deal_id}/final-breakdown`
- GET `/api/legal/deals/{deal_id}/financials`
- POST `/api/legal/deals/{deal_id}/payments`
- GET `/api/legal/deals/{deal_id}/payments`
- POST `/api/legal/deals/{deal_id}/payments/recompute`
- POST `/api/legal/deposits`
- GET `/api/legal/deposits/{deposit_id}`
- PUT `/api/legal/deposits/{deposit_id}/confirm-payment`
- POST `/api/legal/deposits/{deposit_id}/forfeit/request`
- POST `/api/legal/deposits/{deposit_id}/refund/request`
- GET `/api/legal/payments/{payment_id}`
- POST `/api/legal/payments/{payment_id}/confirm`
- GET `/api/manager/calls/missed`
- GET `/api/manager/calls/my`
- POST `/api/manager/calls/{call_id}/outcome`
- POST `/api/manager/invoices`
- GET `/api/manager/invoices/my`
- GET `/api/manager/orders`
- POST `/api/manager/tracking/attach`
- GET `/api/manager/tracking/providers`
- POST `/api/manager/tracking/quick-track`
- GET `/api/manager/tracking/search`
- GET `/api/manager/wishlist-deals`
- POST `/api/manager/wishlist-deals`
- GET `/api/manager/wishlist-deals/vin-search`
- DELETE `/api/manager/wishlist-deals/{item_id}`
- GET `/api/meetings`
- POST `/api/meetings`
- GET `/api/meetings/calendar`
- PATCH `/api/meetings/{meeting_id}`
- DELETE `/api/meetings/{meeting_id}`
- GET `/api/orders/{order_id}`
- POST `/api/orders/{order_id}/acceptance-act`
- POST `/api/orders/{order_id}/notes`
- PATCH `/api/orders/{order_id}/steps/{step_id}`
- POST `/api/ringostat/callback`
- GET `/api/risk/manager/{manager_id}`
- GET `/api/roadmaps/{roadmap_id}`
- PATCH `/api/roadmaps/{roadmap_id}/stages/{stage_key}`
- PATCH `/api/roadmaps/{roadmap_id}/stages/{stage_key}/checklist/{item_key}`
- POST `/api/roadmaps/{roadmap_id}/stages/{stage_key}/risks`
- DELETE `/api/roadmaps/{roadmap_id}/stages/{stage_key}/risks/{risk_id}`
- GET `/api/sales`
- POST `/api/sales`
- GET `/api/sales/{sale_id}`
- PATCH `/api/sales/{sale_id}`
- DELETE `/api/sales/{sale_id}`
- POST `/api/sales/{sale_id}/handover-act`
- GET `/api/sales/{sale_id}/handover-acts`
- GET `/api/shipments`
- POST `/api/shipments`
- POST `/api/shipments/bind-by-vin`
- GET `/api/shipments/{shipment_id}`
- PUT `/api/shipments/{shipment_id}`
- GET `/api/shipments/{shipment_id}/journey`
- GET `/api/shipments/{shipment_id}/live`
- POST `/api/shipments/{shipment_id}/stages`
- POST `/api/shipments/{shipment_id}/stages/advance`
- PUT `/api/shipments/{shipment_id}/stages/{stage_id}`
- POST `/api/shipments/{shipment_id}/stages/{stage_id}/activate`
- POST `/api/shipments/{shipment_id}/tick`
- POST `/api/shipments/{shipment_id}/tick_legacy_removed_keep_url_hint`
- POST `/api/shipments/{shipment_id}/transfer-vessel`
- POST `/api/shipments/{shipment_id}/vessel`
- GET `/api/shipments/{shipment_id}/vessel-history`
- POST `/api/shipments/{shipment_id}/vessel/legacy-attach`
- GET `/api/team-lead/login-audit`
- GET `/api/team/orders`
- GET `/api/team/roadmaps`
- GET `/api/teamlead/calls/managers`
- GET `/api/teamlead/calls/overview`
- GET `/api/vessels/{imo}/position`

</details>

<details><summary><b>require_user</b> (187)</summary>

- GET `/api/actions`
- POST `/api/actions`
- GET `/api/actions/analytics`
- GET `/api/actions/inbox`
- GET `/api/actions/my`
- GET `/api/actions/sources`
- POST `/api/actions/sync`
- GET `/api/actions/team`
- GET `/api/actions/{action_id}`
- PATCH `/api/actions/{action_id}`
- POST `/api/actions/{action_id}/assign`
- POST `/api/actions/{action_id}/comment`
- POST `/api/actions/{action_id}/escalate`
- POST `/api/actions/{action_id}/reopen`
- POST `/api/actions/{action_id}/resolve`
- POST `/api/actions/{action_id}/snooze`
- POST `/api/actions/{action_id}/start`
- GET `/api/admin/blog/articles`
- POST `/api/admin/blog/articles`
- GET `/api/admin/blog/articles/{article_id}`
- PUT `/api/admin/blog/articles/{article_id}`
- DELETE `/api/admin/blog/articles/{article_id}`
- POST `/api/admin/blog/upload-image`
- GET `/api/admin/customers/{customer_id}/calls/diagnostics`
- GET `/api/admin/google-reviews`
- GET `/api/admin/google-reviews/config`
- PUT `/api/admin/google-reviews/config`
- POST `/api/admin/google-reviews/manual`
- POST `/api/admin/google-reviews/sync`
- PATCH `/api/admin/google-reviews/{review_id}`
- DELETE `/api/admin/google-reviews/{review_id}`
- GET `/api/admin/lead-requests`
- POST `/api/admin/lead-requests/{req_id}/action`
- POST `/api/admin/reassign`
- GET `/api/admin/reassign/audit`
- GET `/api/admin/reassign/managers`
- PUT `/api/admin/site-info`
- POST `/api/admin/site-info/upload-before-after-image`
- POST `/api/admin/site-info/upload-hero-image`
- POST `/api/admin/site-info/upload-review-image`
- POST `/api/ai/analyze-call`
- GET `/api/ai/call-analysis/{call_id}`
- POST `/api/auth/change-password`
- GET `/api/auth/me`
- GET `/api/cabinet/watchlist`
- DELETE `/api/calculations/{calc_id}`
- POST `/api/calculations/{calc_id}/clone`
- POST `/api/calculations/{calc_id}/comments`
- PATCH `/api/calculations/{calc_id}/overrides`
- PATCH `/api/calculations/{calc_id}/status`
- PATCH `/api/calls/{call_id}/notes`
- GET `/api/calls/{call_id}/notes`
-  `/api/calls/{call_id}/recording`
- GET `/api/calls/{call_id}/recording`
- GET `/api/contracts`
- GET `/api/contracts/me`
- GET `/api/contracts/overview`
- GET `/api/contracts/risk`
- GET `/api/contracts/templates`
- GET `/api/contracts/{contract_id}`
- POST `/api/contracts/{contract_id}/open`
- POST `/api/contracts/{contract_id}/sign`
- GET `/api/customer-portal/customers`
- GET `/api/customer-portal/{customer_id}`
- GET `/api/customer-portal/{customer_id}/deals`
- GET `/api/customer-portal/{customer_id}/deals/{deal_id}`
- GET `/api/customer-portal/{customer_id}/deals/{deal_id}/delivery`
- GET `/api/customer-portal/{customer_id}/deals/{deal_id}/documents`
- GET `/api/customer-portal/{customer_id}/deals/{deal_id}/payments`
- GET `/api/customer-portal/{customer_id}/documents/{doc_id}/download`
- GET `/api/customer-portal/{customer_id}/home`
- GET `/api/customer-portal/{customer_id}/notifications`
- GET `/api/customer-portal/{customer_id}/notifications/unread-count`
- POST `/api/customer-portal/{customer_id}/notifications/{notification_id}/read`
- GET `/api/customers`
- POST `/api/customers`
- PUT `/api/customers/{customer_id}`
- GET `/api/customers/{customer_id}`
- GET `/api/customers/{customer_id}/360`
- GET `/api/customers/{customer_id}/calls`
- GET `/api/customers/{customer_id}/change-history`
- GET `/api/customers/{customer_id}/contracts-legacy`
- GET `/api/customers/{customer_id}/deposits`
- GET `/api/customers/{customer_id}/documents`
- POST `/api/customers/{customer_id}/documents`
- DELETE `/api/customers/{customer_id}/documents/{document_id}`
- GET `/api/customers/{customer_id}/files`
- POST `/api/customers/{customer_id}/files/mark-read`
- GET `/api/customers/{customer_id}/files/totals`
- GET `/api/customers/{customer_id}/files/unread-count`
- GET `/api/customers/{customer_id}/folders`
- GET `/api/customers/{customer_id}/health`
- GET `/api/customers/{customer_id}/meetings`
- GET `/api/customers/{customer_id}/sales`
- GET `/api/customers/{customer_id}/timeline-legacy`
- GET `/api/deals`
- PUT `/api/deals/{deal_id}`
- GET `/api/deals/{deal_id}/change-history`
- GET `/api/delivery/carriers`
- GET `/api/delivery/overview`
- GET `/api/delivery/risk`
- GET `/api/delivery/shipments`
- GET `/api/delivery/{shipment_or_deal_id}`
- GET `/api/executive/bottlenecks`
- GET `/api/executive/dashboard`
- GET `/api/executive/forecast`
- GET `/api/executive/risks`
- GET `/api/executive/team`
- GET `/api/file-manager/files/{file_id}`
- GET `/api/file-manager/files/{file_id}/download`
- GET `/api/files/{key:path}`
- GET `/api/forecast/capacity`
- GET `/api/forecast/cash-flow`
- GET `/api/forecast/overview`
- GET `/api/forecast/pipeline`
- GET `/api/forecast/revenue`
- GET `/api/forecast/risk`
- GET `/api/invoices`
- GET `/api/leads`
- GET `/api/leads/kanban`
- GET `/api/leads/saved-filters`
- POST `/api/leads/saved-filters`
- DELETE `/api/leads/saved-filters/{filter_id}`
- GET `/api/leads/sla/overdue`
- POST `/api/leads/sla/scan`
- GET `/api/leads/sla/settings`
- PUT `/api/leads/sla/settings`
- GET `/api/leads/smart-filters`
- PUT `/api/leads/{lead_id}`
- GET `/api/leads/{lead_id}/360`
- GET `/api/leads/{lead_id}/change-history`
- GET `/api/leads/{lead_id}/notes`
- POST `/api/leads/{lead_id}/notes`
- DELETE `/api/leads/{lead_id}/notes/{note_id}`
- GET `/api/leads/{lead_id}/related-cars`
- POST `/api/leads/{lead_id}/responded`
- GET `/api/leads/{lead_id}/sla`
- PATCH `/api/leads/{lead_id}/status`
- GET `/api/leads/{lead_id}/timeline`
- GET `/api/manager-instructions`
- PUT `/api/manager-instructions`
- GET `/api/manager-instructions/history`
- POST `/api/me/2fa/disable`
- POST `/api/me/2fa/setup`
- GET `/api/me/2fa/status`
- POST `/api/me/2fa/verify`
- GET `/api/me/preferences/ringostat-ui`
- PATCH `/api/me/preferences/ringostat-ui`
- GET `/api/meetings/{meeting_id}`
- GET `/api/notifications/analytics`
- POST `/api/notifications/escalation/scan`
- GET `/api/notifications/inbox`
- GET `/api/notifications/me`
- GET `/api/notifications/preferences`
- PATCH `/api/notifications/preferences`
- POST `/api/notifications/read-all`
- POST `/api/notifications/read-all`
- PATCH `/api/notifications/read-all`
- GET `/api/notifications/rules`
- GET `/api/notifications/unread-count`
- GET `/api/notifications/unread-count`
- POST `/api/notifications/{notif_id}/dismiss`
- POST `/api/notifications/{notif_id}/read`
- PATCH `/api/notifications/{notification_id}/read`
- GET `/api/operations/bottlenecks`
- GET `/api/operations/dashboard`
- GET `/api/operations/risk`
- GET `/api/operations/sla`
- GET `/api/operations/team`
- GET `/api/providers/me/stats`
- GET `/api/providers/{provider_id}/stats`
- GET `/api/tasks`
- POST `/api/tasks`
- GET `/api/tasks/eligible-assignees`
- GET `/api/tasks/reports/customers-without-tasks`
- GET `/api/tasks/reports/leads-without-tasks`
- PATCH `/api/tasks/{task_id}`
- DELETE `/api/tasks/{task_id}`
- POST `/api/tasks/{task_id}/complete`
- POST `/api/tasks/{task_id}/start`
- POST `/api/team/leads/{lead_id}/reassign`
- GET `/api/team/tasks`
- GET `/api/team/tasks/overdue`
- GET `/api/users/me`
- GET `/api/v1/site-activity/by-entity/{entity_id}`
- GET `/api/v1/site-activity/online`
- GET `/api/v1/site-activity/{entity_id}`

</details>

<details><summary><b>require_extension_hmac</b> (8)</summary>

- POST `/api/ext/heartbeat`
- GET `/api/ext/jobs`
- POST `/api/ext/observation`
- POST `/api/ext/push`
- POST `/api/ext/register`
- POST `/api/vesselfinder/heartbeat`
- GET `/api/vesselfinder/jobs`
- POST `/api/vesselfinder/jobs/result`

</details>

<details><summary><b>optional</b> (9)</summary>

- POST `/api/auth/logout`
- POST `/api/calculations`
- GET `/api/calculations`
- GET `/api/calculations-compare`
- GET `/api/calculations/{calc_id}`
- GET `/api/calculations/{calc_id}/comments`
- GET `/api/calculations/{calc_id}/timeline`
- POST `/api/public/search/watch`
- DELETE `/api/public/search/watch/{watch_id}`

</details>
