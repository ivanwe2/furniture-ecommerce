# OBSERVABILITY.md — logs, traces, metrics, usage telemetry

The "why" is ARCHITECTURE §13; operating it (install, passwords, proxy,
alerts) is DEPLOY §11; the security controls are SECURITY T8. This file is
the developer's map: where data comes from, where it goes, how to add to it.

## 1. What lives where

| Signal | Produced by | Stored in | Kept | Look at it in |
|---|---|---|---|---|
| Logs | `src/lib/log.ts` (app, JSON lines); every other container's stdout | Loki (Alloy tails the json-file logs, redacts emails/IPs) | 30 days | Grafana → Explore → Loki; dashboard *System health* |
| Traces | Next.js spans via OpenTelemetry (`src/instrumentation-node.ts`) | Tempo (health-check traces dropped) | 7 days | Grafana → Explore → Tempo; a log line's `traceId` links there |
| Request metrics | Alloy `spanmetrics` from the traces | Prometheus (`traces_span_metrics_*`, labels `next_route`, `http_status_code`, `span_kind`) | 30 days | *System health* |
| Service metrics | Alloy exporters: Postgres, Redis, `/api/health` probe, disk | Prometheus (`pg_*`, `redis_*`, `probe_success`, `node_filesystem_*`) | 30 days | *System health* |
| Usage events | `track()` (server) / `trackClient()` (browser) | Postgres `telemetry.events` | 13 months | *Shop overview*, *Search*, *Products & variants*, *Funnel & journeys*, *Admin usage* |

Without the observability compose file the app still logs JSON to Docker
(`docker compose logs app`) and still records usage events in Postgres;
only tracing switches off (no `OTEL_EXPORTER_OTLP_ENDPOINT`).

## 2. Logs

`const log = logger('order'); log.error('order email failed', { orderNumber, err })`
→ `{"ts":"…","level":"error","area":"order","msg":"order email failed","traceId":"…","orderNumber":"NAS-…","err":{"name":"Error","message":"…","stack":"…"},"version":"<git sha>"}`

Loki labels: `service` (compose service), `stream`, and for the app `level`
and `area`; `traceId` is structured metadata. Useful queries:

```
{service="app", level="error"}                      # every server error
{service="app", area="client"}                      # browser errors (beacon)
{service="app", area=~"order|contact|email"}        # the money path
{service="mail"} |~ "status=(bounced|deferred)"     # mail delivery problems
```

Rules (CONVENTIONS §4): no personal data, ever; `err` goes in the fields.

## 3. Usage events

Table `telemetry.events`: `ts, name, source (web|server|admin), props jsonb,
path, visitor_day, visitor_id, session_id, device, browser, referrer_host`.

| Event | Source | Props | Fired from |
|---|---|---|---|
| `page_view` | web | path | `Telemetry.tsx` (every route change) |
| `product_view` | web | slug, sku | `ProductView` (once per page load) |
| `variant_select` | web | slug, sku | variant radio table |
| `gallery_zoom` | web | slug | lightbox opened |
| `cart_add` | web | slug, sku, qty, cents | „Добави в количката" |
| `cart_remove` | web | sku | cart page |
| `checkout_start` | web | lines, cents | checkout page (once) |
| `inquiry_click` | web | sku, kind (availability/price) | „Запитване за наличност / цена" |
| `phone_click` | web | place | „Обадете се" |
| `consent` | web | choice | consent banner |
| `not_found` | web | path | 404 page |
| `search` | server | q (emails/phones masked), results | `search/page.tsx` |
| `order_placed` | server | lines, cents, method (+ staff) | order action |
| `order_rejected` | server | reason, fields | order action |
| `contact_sent` | server | about (from a product inquiry) | contact action |
| `admin_change` | admin | collection, op, fields (`items.stockQty`…), user id | every collection/global (`lib/telemetry/admin.ts`) |
| `admin_login` | admin | user id | Users `afterLogin` |
| `import_row` | admin | status, image | importer apply endpoint |

`client_error` (browser errors) goes to the logs, not the table.

**Identity.** `visitor_day` = salted SHA-256 of IP + user agent, salt per UTC
day kept 48 h in Redis — counts visitors per day, cannot link days.
`visitor_id`/`session_id` exist only after the visitor clicked „Приемам".
Bots (user agent) and requests with an admin session cookie are skipped;
an admin's own test order is kept but flagged `staff: true`.

**Adding an event**: add it to `CLIENT_EVENTS` (with a zod schema — the
beacon drops anything else) or `ServerEvents` in `lib/telemetry/events.ts`,
call `trackClient`/`track`, add a row above, and a panel in
`scripts/gen-dashboards.ts` if it answers a question.

## 4. Dashboards and alerts

Generated, not hand-edited: `pnpm gen:dashboards` writes
`observability/grafana/dashboards/*.json` from `scripts/gen-dashboards.ts`.
Grafana provisions them read-only on start (experiment with "Save as").
Alert rules + the email contact point: `observability/grafana/provisioning/
alerting/alerts.yaml` (site down, order/contact/email failure, error spike,
5xx share, disk < 15 %, database unreachable).

## 5. Local run

```bash
export GRAFANA_ADMIN_PASSWORD=dev ALERT_EMAIL=alerts@example.invalid \
  GRAFANA_ROOT_URL=http://localhost:3001 GRAFANA_COOKIE_SECURE=false ALERT_SMTP_HOST=mailpit:1025
COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml:docker-compose.observability.yml \
  docker compose up -d --build
# Grafana: http://localhost:3001 (admin / dev) · alert emails: http://localhost:8025
```

Headless browsers are classified as bots — use a normal user agent when
generating test traffic, or nothing is recorded.
