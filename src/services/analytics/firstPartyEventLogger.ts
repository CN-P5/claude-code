/**
 * Stubbed 1P event logger.
 *
 * Fork decision: disable all nonessential analytics traffic. The 1P event
 * logger originally batched events via OTel LoggerProvider + a remote
 * exporter to /api/event_logging/batch. In the fork we keep the named
 * exports and type signatures so business call sites compile unchanged,
 * but every function is a no-op.
 *
 * Types that were used by other modules (e.g. metadata.ts) are kept so
 * downstream imports keep working. The OTel/runtime dependencies have
 * been removed entirely.
 */

import { isAnalyticsDisabled } from './config.js'

/**
 * Configuration for sampling individual event types.
 * Each event name maps to an object containing sample_rate (0-1).
 * Events not in the config are logged at 100% rate.
 */
export type EventSamplingConfig = {
  [eventName: string]: {
    sample_rate: number
  }
}

/**
 * Stubbed sampling-config reader. Always returns {} so no event has an
 * explicit sample rate — shouldSampleEvent will return null (= "log
 * at 100%") for everything, but logEventTo1P itself is also a no-op
 * so the rate is moot.
 */
export function getEventSamplingConfig(): EventSamplingConfig {
  return {}
}

/**
 * Determine if an event should be sampled based on its sample rate.
 * Always returns null in the fork (no sampling applied at the call site,
 * and the downstream logEventTo1P is itself a no-op).
 */
export function shouldSampleEvent(_eventName: string): number | null {
  return null
}

/**
 * Flush and shutdown the 1P event logger.
 * No-op in the fork.
 */
export async function shutdown1PEventLogging(): Promise<void> {
  // No-op.
}

/**
 * Check if 1P event logging is enabled.
 * Always returns false in the fork so any defensive checks elsewhere
 * short-circuit.
 */
export function is1PEventLoggingEnabled(): boolean {
  // isAnalyticsDisabled is consulted for symmetry with the original
  // opt-out semantics, but the result is forced to false in the fork.
  void isAnalyticsDisabled
  return false
}

/**
 * Log a 1st-party event. No-op in the fork.
 */
export function logEventTo1P(
  _eventName: string,
  _metadata: Record<string, number | boolean | undefined> = {},
): void {
  // No-op: 1P event logging is disabled in the fork.
}

/**
 * GrowthBook experiment event data for logging
 * (kept for type-compat with the original module).
 */
export type GrowthBookExperimentData = {
  experimentId: string
  variationId: number
  userAttributes?: Record<string, unknown>
  experimentMetadata?: Record<string, unknown>
}

/**
 * Log a GrowthBook experiment assignment event to 1P. No-op in the fork.
 */
export function logGrowthBookExperimentTo1P(
  _data: GrowthBookExperimentData,
): void {
  // No-op.
}

/**
 * Initialize 1P event logging infrastructure. No-op in the fork.
 */
export function initialize1PEventLogging(): void {
  // No-op.
}

/**
 * Rebuild the 1P event logging pipeline if the batch config changed.
 * No-op in the fork.
 */
export async function reinitialize1PEventLoggingIfConfigChanged(): Promise<void> {
  // No-op.
}
