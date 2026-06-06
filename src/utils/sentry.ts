/**
 * Sentry integration module — stubbed for fork deployment.
 *
 * The original implementation initialized the @sentry/node SDK when
 * SENTRY_DSN was set. In the fork, all observability-vendor traffic
 * is disabled, so this module is a no-op shell that keeps the
 * public function signatures so callers (and tests that mock them)
 * keep compiling.
 */

let initialized = false

/**
 * Initialize Sentry SDK. No-op in the fork.
 */
export function initSentry(): void {
  initialized = true
}

/**
 * Capture an exception. No-op in the fork.
 */
export function captureException(
  _error: unknown,
  _context?: Record<string, unknown>,
): void {
  // No-op.
}

/**
 * Set a tag on the current scope. No-op in the fork.
 */
export function setTag(_key: string, _value: string): void {
  // No-op.
}

/**
 * Set user context. No-op in the fork.
 */
export function setUser(_user: { id?: string; email?: string } | null): void {
  // No-op.
}

/**
 * Flush queued events and close the client. No-op in the fork.
 */
export async function closeSentry(_timeoutMs = 2000): Promise<void> {
  // No-op.
}

/**
 * Test-only: reset module-level state.
 */
export function _resetSentryForTesting(): void {
  initialized = false
}
