/**
 * Policy Limits Service — stubbed for fork deployment.
 *
 * The original implementation fetched organization-level policy
 * restrictions from /api/claude_code/policy_limits and used them to
 * gate features. In the fork there is no remote server, so:
 *   - isPolicyLimitsEligible() returns false
 *   - isPolicyAllowed() returns true (fail-open)
 *
 * All other entry points are no-ops.
 */

/**
 * Policies that would default to denied when essential-traffic-only mode
 * is active and the policy cache is unavailable. Kept as a Set so callers
 * that import the constant keep working.
 */
const ESSENTIAL_TRAFFIC_DENY_ON_MISS = new Set(['allow_product_feedback'])

/**
 * Test-only sync reset. No-op in the fork.
 */
export function _resetPolicyLimitsForTesting(): void {
  // No-op.
}

/**
 * Initialize the loading promise for policy limits. No-op.
 */
export function initializePolicyLimitsLoadingPromise(): void {
  // No-op.
}

/**
 * Check if the current user is eligible for policy limits.
 * Always false in the fork.
 */
export function isPolicyLimitsEligible(): boolean {
  return false
}

/**
 * Wait for the initial policy limits loading to complete. Resolves immediately.
 */
export async function waitForPolicyLimitsToLoad(): Promise<void> {
  // No-op.
}

/**
 * Check if a specific policy is allowed.
 * Returns true in the fork (fail-open) — there are no remote policies.
 */
export function isPolicyAllowed(_policy: string): boolean {
  // Fail open: with no remote policy source, every policy is allowed.
  // ESSENTIAL_TRAFFIC_DENY_ON_MISS is preserved as a Set for import
  // compatibility but does not flip the result here.
  return true
}

/**
 * Load policy limits during CLI initialization. No-op.
 */
export async function loadPolicyLimits(): Promise<void> {
  // No-op.
}

/**
 * Refresh policy limits asynchronously. No-op.
 */
export async function refreshPolicyLimits(): Promise<void> {
  // No-op.
}

/**
 * Clear all policy limits (session, persistent, and stop polling). No-op.
 */
export async function clearPolicyLimitsCache(): Promise<void> {
  // No-op.
}

/**
 * Start background polling for policy limits. No-op.
 */
export function startBackgroundPolling(): void {
  // No-op.
}

/**
 * Stop background polling for policy limits. No-op.
 */
export function stopBackgroundPolling(): void {
  // No-op.
}

// Re-export for source-compat with any importer.
export { ESSENTIAL_TRAFFIC_DENY_ON_MISS }
