/**
 * Analytics sink implementation
 *
 * Stubbed: all nonessential analytics traffic is disabled in the fork.
 * Functions are kept for API compatibility — callers can still invoke
 * initializeAnalyticsSink/initializeAnalyticsGates without effect.
 */

import { attachAnalyticsSink, stripProtoFields } from './index.js'

// Local type matching the logEvent metadata signature
type LogEventMetadata = { [key: string]: boolean | number | undefined }

/**
 * Initialize analytics gates during startup.
 *
 * No-op in the fork — there are no remote gates to read.
 */
export function initializeAnalyticsGates(): void {
  // No-op: gates are read from LOCAL_GATE_DEFAULTS only.
}

/**
 * Initialize the analytics sink.
 *
 * No-op in the fork — events are dropped at logEvent().
 * Kept for API compatibility with callers that may still invoke it.
 */
export function initializeAnalyticsSink(): void {
  // No-op: there is no remote sink to attach. Events go to the
  // no-op queue in ./index.ts and are silently dropped.
  // We still call attachAnalyticsSink to drain any pre-attach queue
  // (in the fork, the queue is also a no-op, but this preserves
  // the contract).
  attachAnalyticsSink({
    logEvent: () => {},
    logEventAsync: async () => {},
  })
}

// Re-export for callers that need stripProtoFields
export { stripProtoFields }

// Re-export internal type so the public surface matches the previous shape.
export type { LogEventMetadata }
