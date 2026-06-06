/**
 * Settings Sync Service — stubbed for fork deployment.
 *
 * The original implementation synced user settings / memory files
 * across Claude Code environments via /api/claude_code/user_settings.
 * In the fork there is no remote sync — every entry point is a no-op
 * that returns the same shape the original would have returned on
 * "skip" / "not eligible" paths.
 */

let downloadPromise: Promise<boolean> | null = null

/**
 * Upload local settings to remote. No-op in the fork.
 */
export async function uploadUserSettingsInBackground(): Promise<void> {
  // No-op: settings sync is disabled in the fork.
}

/** Test-only: clear the cached download promise between tests. */
export function _resetDownloadPromiseForTesting(): void {
  downloadPromise = null
}

/**
 * Download settings from remote for CCR mode.
 * Always resolves false in the fork (no settings to apply).
 */
export function downloadUserSettings(): Promise<boolean> {
  if (downloadPromise) {
    return downloadPromise
  }
  downloadPromise = Promise.resolve(false)
  return downloadPromise
}

/**
 * Force a fresh download. Always resolves false in the fork.
 */
export function redownloadUserSettings(): Promise<boolean> {
  downloadPromise = Promise.resolve(false)
  return downloadPromise
}
