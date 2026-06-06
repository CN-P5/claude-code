/**
 * Telemetry attributes — stubbed for fork deployment.
 *
 * The original implementation enriched outgoing OTel records with
 * user-id, session-id, OAuth account, terminal-type, etc. In the
 * fork there is no exporter — getTelemetryAttributes() returns an
 * empty object so any caller-side code that does
 * `Object.assign({}, getTelemetryAttributes(), …)` keeps working.
 */

export function getTelemetryAttributes(): Record<string, never> {
  return {}
}
