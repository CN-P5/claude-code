/**
 * OTel event helper — stubbed for fork deployment.
 *
 * The original implementation forwarded structured events to the
 * OTel event logger so they could be exported through the configured
 * pipeline. In the fork there is no exporter — the public functions
 * are no-ops that preserve the call-site shape.
 */

let eventSequence = 0
let hasWarnedNoEventLogger = false

export function redactIfDisabled(content: string): string {
  // No telemetry in the fork → treat every value as if it were redacted
  // so we never accidentally surface a user prompt in the OTel pipeline.
  void hasWarnedNoEventLogger
  void eventSequence
  return '<REDACTED>'
}

export async function logOTelEvent(
  _eventName: string,
  _metadata: { [key: string]: string | undefined } = {},
): Promise<void> {
  // No-op: OTel event logger is disabled in the fork.
}
