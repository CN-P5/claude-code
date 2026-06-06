/**
 * Telemetry instrumentation — stubbed for fork deployment.
 *
 * The original implementation bootstrapped a full OpenTelemetry SDK
 * (metrics, logs, traces) with multiple exporter types, OTLP/BigQuery
 * routing, proxy/mTLS handling, and beta-tracing sidecar. In the fork
 * all nonessential telemetry traffic is disabled — every entry point
 * is a no-op that preserves the public shape.
 *
 * `parseExporterTypes` is kept because it is a pure string-parsing
 * utility with no runtime cost.
 */

/**
 * Per OTEL spec, "none" means "no automatically configured exporter for this signal".
 * https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/#exporter-selection
 *
 * Pure utility — kept unchanged.
 */
export function parseExporterTypes(value: string | undefined): string[] {
  return (value || '')
    .trim()
    .split(',')
    .filter(Boolean)
    .map(t => t.trim())
    .filter(t => t !== 'none')
}

/**
 * Configure OTEL_* env vars at startup. No-op in the fork.
 */
export function bootstrapTelemetry(): void {
  // No-op.
}

/**
 * Check if customer telemetry is enabled.
 * Returns false in the fork — there is no telemetry pipeline.
 */
export function isTelemetryEnabled(): boolean {
  return false
}

/**
 * Initialize telemetry. No-op in the fork.
 * Returns null to mirror the original "no meter created" outcome.
 */
export async function initializeTelemetry(): Promise<null> {
  return null
}

/**
 * Flush all pending telemetry data immediately. No-op in the fork.
 */
export async function flushTelemetry(): Promise<void> {
  // No-op.
}
