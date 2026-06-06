/**
 * Stubbed skill-loaded event helper.
 *
 * The original implementation logged a `tengu_skill_loaded` event per
 * available skill. In the fork there is no analytics pipeline —
 * the function is a no-op that preserves the call-site shape.
 */

export async function logSkillsLoaded(
  _cwd: string,
  _contextWindowTokens: number,
): Promise<void> {
  // No-op: skills-loaded telemetry is disabled in the fork.
}
