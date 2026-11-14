/**
 * Structured logging (CONVENTIONS §7, ARCHITECTURE §13): ONE JSON object per
 * line, on stdout (debug/info) or stderr (warn/error). Docker keeps the lines;
 * in the observability stack Alloy ships them to Loki, where `level`, `area`
 * and `traceId` are queryable and a traceId links straight to its trace.
 *
 *   const log = logger('order')
 *   log.info('order placed', { orderNumber, lines: 3 })
 *   log.error('email failed', { orderNumber, err })
 *
 * Rules:
 * - Never log personal data: no names, phones, emails, addresses, IPs, message
 *   bodies. Order numbers, SKUs, slugs and counts are fine. As a safety net,
 *   anything shaped like an email address is replaced with `<email>` — error
 *   messages from mail libraries quote recipients.
 * - `err` is serialised (name, message, stack) — JSON.stringify of an Error is
 *   `{}`, which is how Payload's production errors used to vanish.
 *
 * Pure and dependency-light: safe in the Node and Edge runtimes (middleware,
 * onRequestError). The active OpenTelemetry span, when tracing is on, adds
 * `traceId`/`spanId`.
 */
import { trace } from '@opentelemetry/api'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogFields = Record<string, unknown>

const RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }

function minRank(): number {
  const wanted = (process.env.LOG_LEVEL ?? '').toLowerCase()
  return wanted in RANK ? RANK[wanted as LogLevel] : RANK.info
}

const EMAIL = /[^\s@<>"'(),;:]+@[^\s@<>"'(),;:]+\.[a-z]{2,}/gi

/** Replace anything that looks like an email address. */
export function redact(text: string): string {
  return text.replace(EMAIL, '<email>')
}

export function serializeError(err: unknown): { name: string; message: string; stack?: string; code?: string } {
  if (err instanceof Error) {
    const code = (err as { code?: unknown }).code
    return {
      name: err.name,
      message: redact(err.message),
      ...(err.stack ? { stack: redact(err.stack) } : {}),
      ...(typeof code === 'string' ? { code } : {}),
    }
  }
  return { name: 'NonError', message: redact(typeof err === 'string' ? err : safeJson(err)) }
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

function clean(value: unknown, depth = 0): unknown {
  if (value instanceof Error) return serializeError(value)
  if (typeof value === 'string') return redact(value)
  if (value === null || typeof value !== 'object') return value
  if (depth > 4) return '[depth]'
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => clean(v, depth + 1))
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value)) out[k] = clean(v, depth + 1)
  return out
}

function traceIds(): { traceId?: string; spanId?: string } {
  try {
    const ctx = trace.getActiveSpan()?.spanContext()
    if (!ctx || /^0+$/.test(ctx.traceId)) return {}
    return { traceId: ctx.traceId, spanId: ctx.spanId }
  } catch {
    return {}
  }
}

/** The JSON line for one entry (exported for tests). */
export function formatLine(level: LogLevel, area: string, msg: string, fields?: LogFields): string {
  const { err, ...rest } = fields ?? {}
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    area,
    msg: redact(msg),
    ...traceIds(),
    ...(clean(rest) as Record<string, unknown>),
    ...(err !== undefined ? { err: serializeError(err) } : {}),
  }
  if (process.env.APP_VERSION) entry.version = process.env.APP_VERSION
  return safeJson(entry)
}

export function log(level: LogLevel, area: string, msg: string, fields?: LogFields): void {
  if (RANK[level] < minRank()) return
  const line = formatLine(level, area, msg, fields)
  if (level === 'error' || level === 'warn') console.error(line)
  else console.log(line)
}

export type Logger = Record<LogLevel, (msg: string, fields?: LogFields) => void>

export function logger(area: string): Logger {
  return {
    debug: (msg, fields) => log('debug', area, msg, fields),
    info: (msg, fields) => log('info', area, msg, fields),
    warn: (msg, fields) => log('warn', area, msg, fields),
    error: (msg, fields) => log('error', area, msg, fields),
  }
}

/** Log at most once per `windowMs` per key — for repeating failures (Redis down). */
export function throttled(windowMs: number) {
  const last = new Map<string, number>()
  return (key: string, write: () => void) => {
    const now = Date.now()
    if ((last.get(key) ?? 0) + windowMs > now) return
    last.set(key, now)
    write()
  }
}
