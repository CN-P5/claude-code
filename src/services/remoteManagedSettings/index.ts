/**
 * Remote Managed Settings Service — stubbed for fork deployment.
 *
 * The original implementation fetched /api/claude_code/settings, validated
 * it against a remote checksum, and exposed a session cache. In the fork
 * there is no remote server — every function is a no-op that preserves
 * the original signatures.
 *
 * `computeChecksumFromSettings` is kept (pure function, used in tests).
 */

import { createHash } from 'crypto'
import { jsonStringify } from '../../utils/slowOperations.js'
import type { SettingsJson } from '../../utils/settings/types.js'

/**
 * Initialize the loading promise for remote managed settings.
 * No-op in the fork.
 */
export function initializeRemoteManagedSettingsLoadingPromise(): void {
  // No-op.
}

/**
 * Recursively sort all keys in an object to match Python's json.dumps(sort_keys=True).
 */
function sortKeysDeep(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sortKeysDeep)
  }
  if (obj !== null && typeof obj === 'object') {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortKeysDeep((obj as Record<string, unknown>)[key])
    }
    return sorted
  }
  return obj
}

/**
 * Compute checksum from settings content for HTTP caching.
 * Pure function — kept identical to the original for test compatibility.
 */
export function computeChecksumFromSettings(settings: SettingsJson): string {
  const sorted = sortKeysDeep(settings)
  const normalized = jsonStringify(sorted)
  const hash = createHash('sha256').update(normalized).digest('hex')
  return `sha256:${hash}`
}

/**
 * Check if the current user is eligible for remote managed settings.
 * Always false in the fork.
 */
export function isEligibleForRemoteManagedSettings(): boolean {
  return false
}

/**
 * Wait for the initial remote settings loading to complete. Resolves immediately.
 */
export async function waitForRemoteManagedSettingsToLoad(): Promise<void> {
  // No-op.
}

/**
 * Clear all remote settings (session, persistent, and stop polling). No-op.
 */
export async function clearRemoteManagedSettingsCache(): Promise<void> {
  // No-op.
}

/**
 * Fetch and load remote settings. No-op.
 */
export async function loadRemoteManagedSettings(): Promise<void> {
  // No-op.
}

/**
 * Refresh remote settings asynchronously. No-op.
 */
export async function refreshRemoteManagedSettings(): Promise<void> {
  // No-op.
}

/**
 * Start background polling for remote settings. No-op.
 */
export function startBackgroundPolling(): void {
  // No-op.
}

/**
 * Stop background polling for remote settings. No-op.
 */
export function stopBackgroundPolling(): void {
  // No-op.
}
