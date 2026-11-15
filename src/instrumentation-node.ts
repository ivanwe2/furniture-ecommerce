import { context, trace } from '@opentelemetry/api'
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BatchSpanProcessor, TracerProvider } from '@opentelemetry/sdk-trace'
import { log } from '@/lib/log'
import { flush, purgeOldEvents } from '@/lib/telemetry/server'

/**
 * Node-runtime setup, loaded once by instrumentation.ts.
 *
 * Tracing: only when OTEL_EXPORTER_OTLP_ENDPOINT is set — the observability
 * compose file sets it to Alloy; the core stack runs without. Next.js emits a
 * span per request (route, status, duration) plus render/fetch spans; Alloy
 * turns them into request-rate/latency/error metrics and stores the traces in
 * Tempo, and lib/log.ts stamps each log line with the active trace id.
 */
if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  const provider = new TracerProvider({
    resource: resourceFromAttributes({
      'service.name': process.env.OTEL_SERVICE_NAME ?? 'nasteh-app',
      'service.version': process.env.APP_VERSION ?? 'dev',
    }),
    spanProcessors: [new BatchSpanProcessor({ exporter: new OTLPTraceExporter() })],
  })
  context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable())
  trace.setGlobalTracerProvider(provider)
  process.once('SIGTERM', () => void provider.shutdown())
  log('info', 'otel', 'tracing enabled', { endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT })
}

// Crashes and stray rejections end up in the logs with a stack. The *Monitor
// variant observes without changing Node's behaviour (the process still exits).
process.on('uncaughtExceptionMonitor', (err) => log('error', 'process', 'uncaught exception', { err }))
process.on('unhandledRejection', (reason) => log('error', 'process', 'unhandled promise rejection', { err: reason }))

// Usage telemetry: write what is queued before a restart; purge rows older
// than 13 months shortly after boot and then daily.
process.once('SIGTERM', () => void flush())
const DAY = 24 * 60 * 60 * 1000
setTimeout(() => void purgeOldEvents(), 60_000).unref()
setInterval(() => void purgeOldEvents(), DAY).unref()
