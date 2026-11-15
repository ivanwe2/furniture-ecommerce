/**
 * Generates the provisioned Grafana dashboards (observability/grafana/
 * dashboards/*.json) from the compact definitions below. Edit here, then:
 *
 *   pnpm gen:dashboards
 *
 * Dashboards are provisioned read-only (allowUiUpdates: false) so the repo
 * stays the source of truth; to experiment, "Save as" a copy in Grafana.
 *
 * Data sources (provisioning/datasources/datasources.yaml):
 *   telemetry  — Postgres, schema `telemetry` only (usage events)
 *   prometheus — request metrics (span metrics), exporters, uptime probe
 *   loki       — logs (service / level / area labels)
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

type Ds = 'telemetry' | 'prometheus' | 'loki'
const DS: Record<Ds, { type: string; uid: string }> = {
  telemetry: { type: 'grafana-postgresql-datasource', uid: 'telemetry' },
  prometheus: { type: 'prometheus', uid: 'prometheus' },
  loki: { type: 'loki', uid: 'loki' },
}

type Panel = {
  type: 'stat' | 'timeseries' | 'table' | 'barchart' | 'piechart' | 'bargauge' | 'logs' | 'text'
  title: string
  w: number
  h: number
  ds?: Ds
  /** SQL (telemetry), PromQL (prometheus) or LogQL (loki); several → several series. */
  queries?: { q: string; legend?: string; format?: 'table' | 'time_series' }[]
  unit?: string
  description?: string
  options?: Record<string, unknown>
  decimals?: number
  content?: string
  /** Colour steps, lowest first: [[color, from]]. Default: one neutral colour. */
  thresholds?: [string, number | null][]
}

/** Alloy's own data volume sits on the host partition that holds every Docker volume. */
const DISK_MOUNT = '/var/lib/alloy/data'

// Reused SQL fragments. `$__timeFilter(ts)` is Grafana's macro for the picker.
const WEB = `source = 'web' AND $__timeFilter(ts)`
/** Distinct visitors summed per day (the visitor hash rotates daily). */
const VISITOR_DAYS = `count(DISTINCT (visitor_day, ts::date))`

function sqlTarget(q: string, format: 'table' | 'time_series' = 'table') {
  return { rawQuery: true, editorMode: 'code', format, rawSql: q.trim() }
}

function build(uid: string, title: string, description: string, panels: Panel[], time = 'now-30d') {
  let x = 0
  let y = 0
  let rowH = 0
  const out = panels.map((p, i) => {
    if (x + p.w > 24) {
      x = 0
      y += rowH
      rowH = 0
    }
    const gridPos = { x, y, w: p.w, h: p.h }
    x += p.w
    rowH = Math.max(rowH, p.h)
    const ds = p.ds ? DS[p.ds] : undefined
    const targets = (p.queries ?? []).map((q, j) => {
      const refId = String.fromCharCode(65 + j)
      if (p.ds === 'telemetry') return { refId, datasource: ds, ...sqlTarget(q.q, q.format) }
      if (p.ds === 'loki') return { refId, datasource: ds, expr: q.q, legendFormat: q.legend, queryType: 'range' }
      return { refId, datasource: ds, expr: q.q, legendFormat: q.legend, range: true }
    })
    return {
      id: i + 1,
      type: p.type,
      title: p.title,
      ...(p.description ? { description: p.description } : {}),
      gridPos,
      ...(ds ? { datasource: ds } : {}),
      targets,
      fieldConfig: {
        defaults: {
          ...(p.unit ? { unit: p.unit } : {}),
          ...(p.decimals !== undefined ? { decimals: p.decimals } : {}),
          // Grafana's default (green, red from 80) would paint every count
          // over 80 — a database of 32 MiB — red. Neutral unless set.
          thresholds: {
            mode: 'absolute',
            steps: (p.thresholds ?? [['text', null]]).map(([color, value]) => ({ color, value })),
          },
          ...(p.type === 'timeseries' || p.type === 'barchart' ? { color: { mode: 'palette-classic' } } : {}),
        },
        overrides: [],
      },
      options: p.type === 'text' ? { mode: 'markdown', content: p.content ?? '' } : (p.options ?? {}),
    }
  })
  return {
    uid,
    title,
    description,
    tags: ['nasteh'],
    timezone: 'browser',
    editable: false,
    schemaVersion: 41,
    time: { from: time, to: 'now' },
    refresh: '5m',
    panels: out,
  }
}

const stat = (title: string, q: string, unit?: string, w = 4): Panel => ({ type: 'stat', title, w, h: 4, ds: 'telemetry', queries: [{ q }], unit })
const daily = (title: string, series: { q: string }[], w = 12): Panel => ({
  type: 'timeseries',
  title,
  w,
  h: 8,
  ds: 'telemetry',
  queries: series.map((s) => ({ ...s, format: 'time_series' as const })),
  options: { legend: { displayMode: 'list', placement: 'bottom' } },
})
const table = (title: string, q: string, w = 12, h = 9, description?: string): Panel => ({ type: 'table', title, w, h, ds: 'telemetry', queries: [{ q }], description })

const dashboards = [
  build('nasteh-shop', 'Shop overview', 'Storefront usage: visitors, views, carts, orders. Visitors = distinct visitors per day, summed (the anonymous hash rotates daily).', [
    stat('Visitors (per-day, summed)', `SELECT ${VISITOR_DAYS} FROM telemetry.events WHERE ${WEB}`),
    stat('Page views', `SELECT count(*) FROM telemetry.events WHERE name = 'page_view' AND ${WEB}`),
    stat('Product views', `SELECT count(*) FROM telemetry.events WHERE name = 'product_view' AND ${WEB}`),
    stat('Added to cart', `SELECT count(*) FROM telemetry.events WHERE name = 'cart_add' AND ${WEB}`),
    stat('Orders', `SELECT count(*) FROM telemetry.events WHERE name = 'order_placed' AND NOT coalesce((props->>'staff')::boolean, false) AND $__timeFilter(ts)`),
    stat('Order value', `SELECT coalesce(sum((props->>'cents')::bigint), 0) / 100.0 FROM telemetry.events WHERE name = 'order_placed' AND NOT coalesce((props->>'staff')::boolean, false) AND $__timeFilter(ts)`, 'currencyEUR'),
    daily('Visitors and page views per day', [
      { q: `SELECT date_trunc('day', ts) AS time, ${VISITOR_DAYS} AS "visitors", count(*) FILTER (WHERE name = 'page_view') AS "page views" FROM telemetry.events WHERE ${WEB} GROUP BY 1 ORDER BY 1` },
    ]),
    daily('Orders and order value per day', [
      { q: `SELECT date_trunc('day', ts) AS time, count(*) AS "orders", sum((props->>'cents')::bigint) / 100.0 AS "value €" FROM telemetry.events WHERE name = 'order_placed' AND $__timeFilter(ts) GROUP BY 1 ORDER BY 1` },
    ]),
    table('Top pages', `SELECT path AS "page", count(*) AS "views", ${VISITOR_DAYS} AS "visitors" FROM telemetry.events WHERE name = 'page_view' AND ${WEB} GROUP BY path ORDER BY 2 DESC LIMIT 25`, 10),
    table('Where visitors come from', `SELECT coalesce(referrer_host, '(direct / internal)') AS "referrer", count(*) AS "visits" FROM telemetry.events WHERE name = 'page_view' AND ${WEB} GROUP BY 1 ORDER BY 2 DESC LIMIT 15`, 7),
    { type: 'piechart', title: 'Devices', w: 7, h: 9, ds: 'telemetry', queries: [{ q: `SELECT coalesce(device, 'unknown') AS "device", ${VISITOR_DAYS} AS "visitors" FROM telemetry.events WHERE ${WEB} GROUP BY 1` }], options: { reduceOptions: { values: true, calcs: [] }, legend: { displayMode: 'table', placement: 'right', values: ['value'] } } },
  ]),

  build('nasteh-search', 'Search', 'What people search for — and what they do not find. Zero-result terms are catalogue gaps or names customers use that the catalogue does not.', [
    stat('Searches', `SELECT count(*) FROM telemetry.events WHERE name = 'search' AND $__timeFilter(ts)`, undefined, 6),
    stat('Searches with no results', `SELECT count(*) FROM telemetry.events WHERE name = 'search' AND (props->>'results')::int = 0 AND $__timeFilter(ts)`, undefined, 6),
    stat('No-result share', `SELECT coalesce(avg(CASE WHEN (props->>'results')::int = 0 THEN 1.0 ELSE 0 END), 0) FROM telemetry.events WHERE name = 'search' AND $__timeFilter(ts)`, 'percentunit', 6),
    stat('Distinct terms', `SELECT count(DISTINCT lower(props->>'q')) FROM telemetry.events WHERE name = 'search' AND $__timeFilter(ts)`, undefined, 6),
    daily('Searches per day', [
      { q: `SELECT date_trunc('day', ts) AS time, count(*) AS "searches", count(*) FILTER (WHERE (props->>'results')::int = 0) AS "no results" FROM telemetry.events WHERE name = 'search' AND $__timeFilter(ts) GROUP BY 1 ORDER BY 1` },
    ], 24),
    table('Top search terms', `SELECT lower(props->>'q') AS "term", count(*) AS "searches", round(avg((props->>'results')::int), 1) AS "avg results" FROM telemetry.events WHERE name = 'search' AND $__timeFilter(ts) GROUP BY 1 ORDER BY 2 DESC LIMIT 30`, 12, 12),
    table('Terms with NO results (act on these)', `SELECT lower(props->>'q') AS "term", count(*) AS "searches", max(ts) AS "last searched" FROM telemetry.events WHERE name = 'search' AND (props->>'results')::int = 0 AND $__timeFilter(ts) GROUP BY 1 ORDER BY 2 DESC LIMIT 30`, 12, 12, 'Add the product, or add the term to a product name/description so search finds it.'),
  ]),

  build('nasteh-products', 'Products & variants', 'Interest per product and variant, and demand that the shop cannot currently serve (sold out / price on request).', [
    table('Most viewed products', `
      SELECT v.slug AS "product", v.views AS "views", coalesce(c.adds, 0) AS "added to cart",
             round(100.0 * coalesce(c.adds, 0) / nullif(v.views, 0), 1) AS "add rate %"
      FROM (SELECT props->>'slug' AS slug, count(*) AS views FROM telemetry.events WHERE name = 'product_view' AND ${WEB} GROUP BY 1) v
      LEFT JOIN (SELECT props->>'slug' AS slug, count(*) AS adds FROM telemetry.events WHERE name = 'cart_add' AND ${WEB} GROUP BY 1) c USING (slug)
      ORDER BY v.views DESC LIMIT 30`, 14, 12),
    table('Most added to cart (by variant)', `SELECT props->>'sku' AS "SKU", props->>'slug' AS "product", count(*) AS "adds", sum((props->>'qty')::int) AS "pieces" FROM telemetry.events WHERE name = 'cart_add' AND ${WEB} GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 30`, 10, 12),
    table('Unserved demand — inquiries', `SELECT props->>'sku' AS "SKU", count(*) FILTER (WHERE props->>'kind' = 'availability') AS "asked: in stock?", count(*) FILTER (WHERE props->>'kind' = 'price') AS "asked: price?", max(ts) AS "last" FROM telemetry.events WHERE name = 'inquiry_click' AND ${WEB} GROUP BY 1 ORDER BY 2 + 3 DESC LIMIT 30`, 12, 10, 'Clicks on „Запитване за наличност / цена" — restock or price these first.'),
    table('Variant picks', `SELECT props->>'slug' AS "product", props->>'sku' AS "variant", count(*) AS "selected" FROM telemetry.events WHERE name = 'variant_select' AND ${WEB} GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 30`, 12, 10),
    table('Missing pages hit (404)', `SELECT props->>'path' AS "path", count(*) AS "hits", max(ts) AS "last" FROM telemetry.events WHERE name = 'not_found' AND ${WEB} GROUP BY 1 ORDER BY 2 DESC LIMIT 30`, 24, 8, 'Old links or typos — candidates for redirects.'),
  ]),

  build('nasteh-funnel', 'Funnel & journeys', 'Visitors at each step (per-day visitors, summed). The second row uses only visitors who accepted the consent banner.', [
    {
      type: 'bargauge',
      title: 'Funnel: visit → product → cart → checkout → order',
      w: 24,
      h: 8,
      ds: 'telemetry',
      queries: [{
        q: `SELECT
              ${VISITOR_DAYS} FILTER (WHERE name = 'page_view') AS "1 visited",
              ${VISITOR_DAYS} FILTER (WHERE name = 'product_view') AS "2 viewed a product",
              ${VISITOR_DAYS} FILTER (WHERE name = 'cart_add') AS "3 added to cart",
              ${VISITOR_DAYS} FILTER (WHERE name = 'checkout_start') AS "4 opened checkout",
              ${VISITOR_DAYS} FILTER (WHERE name = 'order_placed') AS "5 ordered"
            FROM telemetry.events WHERE $__timeFilter(ts) AND NOT coalesce((props->>'staff')::boolean, false)`,
      }],
      options: { orientation: 'horizontal', displayMode: 'gradient', reduceOptions: { values: false, calcs: ['lastNotNull'] }, showUnfilled: true },
    },
    stat('Consent: accepted', `SELECT count(*) FROM telemetry.events WHERE name = 'consent' AND props->>'choice' = 'granted' AND ${WEB}`, undefined, 6),
    stat('Consent: declined', `SELECT count(*) FROM telemetry.events WHERE name = 'consent' AND props->>'choice' = 'denied' AND ${WEB}`, undefined, 6),
    stat('Returning visitors (consented)', `SELECT count(*) FROM (SELECT visitor_id FROM telemetry.events WHERE visitor_id IS NOT NULL AND ${WEB} GROUP BY 1 HAVING count(DISTINCT ts::date) > 1) r`, undefined, 6),
    stat('Avg. visits per consented visitor', `SELECT coalesce(round(avg(d), 2), 0) FROM (SELECT count(DISTINCT session_id) AS d FROM telemetry.events WHERE visitor_id IS NOT NULL AND ${WEB} GROUP BY visitor_id) s`, undefined, 6),
    table('Consented journeys: days from first visit to order', `
      SELECT f.visitor_id::text AS "visitor", f.first_seen AS "first visit", o.ordered AS "ordered", (o.ordered::date - f.first_seen::date) AS "days"
      FROM (SELECT visitor_id, min(ts) AS first_seen FROM telemetry.events WHERE visitor_id IS NOT NULL GROUP BY 1) f
      JOIN (SELECT e.visitor_id, min(e.ts) AS ordered FROM telemetry.events e WHERE e.name = 'checkout_start' AND e.visitor_id IS NOT NULL AND $__timeFilter(e.ts) GROUP BY 1) o USING (visitor_id)
      ORDER BY o.ordered DESC LIMIT 30`, 24, 9, 'Uses the checkout step (orders are recorded server-side without the browser id).'),
  ]),

  build('nasteh-admin', 'Admin usage (automation candidates)', 'What the owner does by hand in the admin — frequent, repetitive edits are the candidates for automation.', [
    stat('Admin saves', `SELECT count(*) FROM telemetry.events WHERE name = 'admin_change' AND $__timeFilter(ts)`, undefined, 6),
    stat('Admin logins', `SELECT count(*) FROM telemetry.events WHERE name = 'admin_login' AND $__timeFilter(ts)`, undefined, 6),
    stat('Imported rows', `SELECT count(*) FROM telemetry.events WHERE name = 'import_row' AND $__timeFilter(ts)`, undefined, 6),
    stat('Import pictures failed', `SELECT count(*) FROM telemetry.events WHERE name = 'import_row' AND props->>'image' = 'failed' AND $__timeFilter(ts)`, undefined, 6),
    daily('Admin saves per day, by collection', [
      { q: `SELECT date_trunc('day', ts) AS time, props->>'collection' AS metric, count(*) AS value FROM telemetry.events WHERE name = 'admin_change' AND $__timeFilter(ts) GROUP BY 1, 2 ORDER BY 1` },
    ], 24),
    table('Most edited fields', `SELECT props->>'collection' AS "collection", f AS "field", count(*) AS "edits" FROM telemetry.events, jsonb_array_elements_text(props->'fields') AS f WHERE name = 'admin_change' AND $__timeFilter(ts) GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 30`, 12, 12, 'e.g. products / items.stockQty edited daily → automate the stock sync.'),
    table('Imports', `SELECT props->>'status' AS "row result", props->>'image' AS "picture", count(*) AS "rows" FROM telemetry.events WHERE name = 'import_row' AND $__timeFilter(ts) GROUP BY 1, 2 ORDER BY 3 DESC`, 12, 12),
  ]),

  build('nasteh-health', 'System health', 'Is the shop up, fast and error-free? Requests come from the app traces (span metrics), logs from Loki.', [
    { type: 'stat', title: 'Site up (health probe)', w: 4, h: 4, ds: 'prometheus', thresholds: [['red', null], ['green', 1]], queries: [{ q: 'min(probe_success)' }], options: { reduceOptions: { calcs: ['lastNotNull'] }, colorMode: 'background' } },
    { type: 'stat', title: 'Requests / min', w: 4, h: 4, ds: 'prometheus', queries: [{ q: `(sum(rate(traces_span_metrics_calls_total{span_kind="SPAN_KIND_SERVER", next_route!="", next_route!="/api/health"}[5m])) * 60) or vector(0)` }], decimals: 1 },
    { type: 'stat', title: 'Server errors (5xx) share', w: 4, h: 4, ds: 'prometheus', unit: 'percentunit', thresholds: [['green', null], ['orange', 0.01], ['red', 0.05]], queries: [{ q: `(sum(rate(traces_span_metrics_calls_total{span_kind="SPAN_KIND_SERVER", http_status_code=~"5.."}[15m])) or vector(0)) / sum(rate(traces_span_metrics_calls_total{span_kind="SPAN_KIND_SERVER"}[15m]))` }] },
    { type: 'stat', title: 'Error log lines (24 h)', w: 4, h: 4, ds: 'loki', queries: [{ q: 'sum(count_over_time({service="app", level="error"}[24h])) or vector(0)' }], thresholds: [['green', null], ['orange', 1], ['red', 20]] },
    { type: 'stat', title: 'Disk free', w: 4, h: 4, ds: 'prometheus', unit: 'percentunit', thresholds: [['red', null], ['orange', 0.15], ['green', 0.25]], description: 'The partition Docker keeps the volumes on (database, photos, backups), seen through Alloy\'s own volume.', queries: [{ q: `min(node_filesystem_avail_bytes{mountpoint="${DISK_MOUNT}"} / node_filesystem_size_bytes{mountpoint="${DISK_MOUNT}"})` }] },
    { type: 'stat', title: 'Database size', w: 4, h: 4, ds: 'prometheus', unit: 'bytes', queries: [{ q: 'sum(pg_database_size_bytes)' }] },
    { type: 'timeseries', title: 'Requests per minute by page type', w: 12, h: 8, ds: 'prometheus', queries: [{ q: `sum by (next_route) (rate(traces_span_metrics_calls_total{span_kind="SPAN_KIND_SERVER", next_route!="", next_route!="/api/health"}[5m])) * 60`, legend: '{{next_route}}' }] },
    { type: 'timeseries', title: 'Response time p95 by page type', w: 12, h: 8, ds: 'prometheus', unit: 's', queries: [{ q: `histogram_quantile(0.95, sum by (le, next_route) (rate(traces_span_metrics_duration_seconds_bucket{span_kind="SPAN_KIND_SERVER", next_route!="", next_route!="/api/health"}[5m])))`, legend: '{{next_route}}' }] },
    { type: 'timeseries', title: 'Responses by status', w: 12, h: 8, ds: 'prometheus', queries: [{ q: `sum by (http_status_code) (rate(traces_span_metrics_calls_total{span_kind="SPAN_KIND_SERVER"}[5m])) * 60`, legend: '{{http_status_code}}' }] },
    { type: 'timeseries', title: 'Log lines by level and area (app)', w: 12, h: 8, ds: 'loki', queries: [{ q: 'sum by (level, area) (count_over_time({service="app", level=~"warn|error"}[5m]))', legend: '{{level}} {{area}}' }] },
    { type: 'logs', title: 'Recent errors (server)', w: 24, h: 10, ds: 'loki', queries: [{ q: '{service="app", level="error"}' }], options: { showTime: true, wrapLogMessage: true, sortOrder: 'Descending', enableLogDetails: true } },
    { type: 'logs', title: 'Browser errors', w: 12, h: 9, ds: 'loki', queries: [{ q: '{service="app", area="client"}' }], options: { showTime: true, wrapLogMessage: true, sortOrder: 'Descending' } },
    { type: 'logs', title: 'Mail relay', w: 12, h: 9, ds: 'loki', queries: [{ q: '{service="mail"} |~ "status=|reject|error"' }], options: { showTime: true, wrapLogMessage: true, sortOrder: 'Descending' }, description: 'Postfix delivery results (addresses and IPs are redacted).' },
    { type: 'stat', title: 'Postgres up', w: 6, h: 4, ds: 'prometheus', thresholds: [['red', null], ['green', 1]], queries: [{ q: 'min(pg_up)' }], options: { reduceOptions: { calcs: ['lastNotNull'] }, colorMode: 'background' } },
    { type: 'stat', title: 'Postgres connections', w: 6, h: 4, ds: 'prometheus', queries: [{ q: 'sum(pg_stat_activity_count)' }] },
    { type: 'stat', title: 'Redis up', w: 6, h: 4, ds: 'prometheus', thresholds: [['orange', null], ['green', 1]], queries: [{ q: 'min(redis_up)' }], options: { reduceOptions: { calcs: ['lastNotNull'] }, colorMode: 'background' }, description: 'Down = rate limiting falls back to memory; the shop keeps working.' },
    { type: 'stat', title: 'Redis memory', w: 6, h: 4, ds: 'prometheus', unit: 'bytes', queries: [{ q: 'sum(redis_memory_used_bytes)' }] },
  ], 'now-24h'),
]

const outDir = path.resolve(import.meta.dirname, '../observability/grafana/dashboards')
mkdirSync(outDir, { recursive: true })
for (const d of dashboards) {
  writeFileSync(path.join(outDir, `${d.uid}.json`), `${JSON.stringify(d, null, 2)}\n`)
  console.log(`wrote ${d.uid}.json (${d.panels.length} panels)`)
}
