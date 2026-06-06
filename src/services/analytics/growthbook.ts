/**
 * GrowthBook facade — stubbed for fork deployment.
 *
 * Fork decision: disable all nonessential analytics traffic. The original
 * implementation pulled feature values from a remote GrowthBook server
 * with disk-cached fallback, periodic refresh, and env/config overrides.
 * In the fork we keep:
 *   - LOCAL_GATE_DEFAULTS  (the project's intentional feature config)
 *   - The public function shapes
 *   - GrowthBookUserAttributes type
 *   - getApiBaseUrlHost (used in user.ts for proxy detection)
 *
 * Every function is a thin wrapper around LOCAL_GATE_DEFAULTS.
 */

import type { GitHubActionsMetadata } from '../../utils/user.js'

/**
 * User attributes sent to GrowthBook for targeting.
 * Uses UUID suffix (not Uuid) to align with GrowthBook conventions.
 */
export type GrowthBookUserAttributes = {
  id: string
  sessionId: string
  deviceID: string
  platform: 'win32' | 'darwin' | 'linux'
  apiBaseUrlHost?: string
  organizationUUID?: string
  accountUUID?: string
  userType?: string
  subscriptionType?: string
  rateLimitTier?: string
  firstTokenTime?: number
  email?: string
  appVersion?: string
  github?: GitHubActionsMetadata
}

/**
 * Local config overrides for GrowthBook feature gates.
 *
 * In the fork this is the sole source of truth — there is no remote
 * server. The structure mirrors the categories the original code used
 * (P0 local features, P1 API-dependent features, kill switches).
 *
 * Set CLAUDE_CODE_DISABLE_LOCAL_GATES=1 to bypass these defaults and
 * always return the per-call defaultValue.
 */
const LOCAL_GATE_DEFAULTS: Record<string, unknown> = {
  // ── P0: Pure local features ──────────────────────────────────────
  tengu_keybinding_customization_release: true, // Custom keybindings
  tengu_streaming_tool_execution2: true, // Streaming tool execution
  tengu_kairos_cron: true, // Cron/scheduled tasks
  tengu_amber_json_tools: true, // Token-efficient JSON tools (~4.5% savings)
  tengu_immediate_model_command: true, // Instant /model, /fast, /effort during query
  tengu_basalt_3kr: true, // MCP instructions delta (send only changes)
  tengu_pebble_leaf_prune: true, // Session storage leaf pruning
  tengu_chair_sermon: true, // Message smooshing (merge adjacent blocks)
  tengu_lodestone_enabled: true, // Deep link protocol (claude://)
  tengu_auto_background_agents: true, // Auto-background agents after 120s
  tengu_fgts: true, // Fine-grained tool state in system prompt

  // ── P1: API-dependent features ───────────────────────────────────
  tengu_session_memory: true, // Session memory (cross-session persistence)
  tengu_passport_quail: true, // Auto memory extraction
  tengu_moth_copse: true, // Skip memory index, use prefetched memories
  tengu_coral_fern: true, // "Searching past context" section
  tengu_chomp_inflection: true, // Prompt suggestions
  tengu_hive_evidence: true, // Verification agent
  tengu_kairos_brief: true, // Brief mode
  tengu_kairos_brief_config: { enable_slash_command: true }, // Brief /slash command visibility
  tengu_sedge_lantern: true, // Away summary
  tengu_onyx_plover: { enabled: true }, // Auto dream (memory consolidation)
  tengu_willow_mode: 'dialog', // Idle return prompt

  // ── Kill switches (keep true to prevent remote disable) ──────────
  tengu_turtle_carbon: true, // Ultrathink extended thinking
  tengu_amber_stoat: true, // Built-in Explore/Plan agents
  tengu_amber_flint: true, // Agent teams/swarms
  tengu_slim_subagent_claudemd: true, // Slim CLAUDE.md for subagents
  tengu_birch_trellis: true, // Tree-sitter bash security analysis
  tengu_collage_kaleidoscope: true, // macOS clipboard image reading
  tengu_compact_cache_prefix: true, // Reuse prompt cache during compaction
  tengu_kairos_assistant: true, // KAIROS assistant mode activation
  tengu_kairos_cron_durable: true, // Persistent cron tasks
  tengu_attribution_header: true, // API request attribution header
  tengu_slate_prism: true, // Agent progress summaries

  // ── Ultrareview (cloud code review via CCR) ─────────────────────
  tengu_review_bughunter_config: { enabled: true }, // /ultrareview command visibility
  tengu_ccr_bundle_seed_enabled: true, // Bundle seed: skip GitHub App check for branch mode
}

function getLocalGateDefault(feature: string): unknown | undefined {
  if (process.env.CLAUDE_CODE_DISABLE_LOCAL_GATES) {
    return undefined
  }
  return LOCAL_GATE_DEFAULTS[feature]
}

/**
 * Register a callback to fire when GrowthBook feature values refresh.
 * No-op in the fork — there is no remote server to refresh from.
 * Returns a no-op unsubscribe function so existing callers don't break.
 */
export function onGrowthBookRefresh(
  _listener: () => void | Promise<void>,
): () => void {
  // No-op: there is no remote source, so no refresh events.
  return () => {}
}

/**
 * Check if a feature has an env-var override.
 * Always returns false in the fork — env-var overrides are stripped.
 */
export function hasGrowthBookEnvOverride(_feature: string): boolean {
  return false
}

/**
 * Enumerate all known GrowthBook features and their resolved values.
 * Returns LOCAL_GATE_DEFAULTS (the only source of truth in the fork).
 */
export function getAllGrowthBookFeatures(): Record<string, unknown> {
  return { ...LOCAL_GATE_DEFAULTS }
}

/**
 * Returns the active config overrides (empty in the fork).
 */
export function getGrowthBookConfigOverrides(): Record<string, unknown> {
  return {}
}

/**
 * Set or clear a single config override. No-op in the fork.
 */
export function setGrowthBookConfigOverride(
  _feature: string,
  _value: unknown,
): void {
  // No-op: env-var and config overrides are stripped in the fork.
}

/**
 * Clear all config overrides. No-op in the fork.
 */
export function clearGrowthBookConfigOverrides(): void {
  // No-op.
}

/**
 * Hostname of ANTHROPIC_BASE_URL when it points at a non-Anthropic proxy.
 * Returns undefined for unset/default (api.anthropic.com) so the attribute
 * is absent for direct-API users.
 */
export function getApiBaseUrlHost(): string | undefined {
  const baseUrl = process.env.ANTHROPIC_BASE_URL
  if (!baseUrl) return undefined
  try {
    const host = new URL(baseUrl).host
    if (host === 'api.anthropic.com') return undefined
    return host
  } catch {
    return undefined
  }
}

/**
 * @deprecated Use getFeatureValue_CACHED_MAY_BE_STALE instead, which is non-blocking.
 * Now synchronous in the fork.
 */
export function getFeatureValue_DEPRECATED<T>(
  feature: string,
  defaultValue: T,
): T {
  return getFeatureValue_CACHED_MAY_BE_STALE(feature, defaultValue)
}

/**
 * Get a feature value from the local gate defaults.
 * Returns the local default if defined, otherwise the per-call default.
 */
export function getFeatureValue_CACHED_MAY_BE_STALE<T>(
  feature: string,
  defaultValue: T,
): T {
  const localDefault = getLocalGateDefault(feature)
  return localDefault !== undefined ? (localDefault as T) : defaultValue
}

/**
 * @deprecated Disk cache is redundant when LOCAL_GATE_DEFAULTS is the
 * sole source of truth. Delegates to getFeatureValue_CACHED_MAY_BE_STALE.
 */
export function getFeatureValue_CACHED_WITH_REFRESH<T>(
  feature: string,
  defaultValue: T,
  _refreshIntervalMs: number,
): T {
  return getFeatureValue_CACHED_MAY_BE_STALE(feature, defaultValue)
}

/**
 * Check a Statsig feature gate value. Returns the local default or false.
 *
 * **MIGRATION ONLY**: Kept for migration of existing Statsig gates.
 */
export function checkStatsigFeatureGate_CACHED_MAY_BE_STALE(
  gate: string,
): boolean {
  return Boolean(getFeatureValue_CACHED_MAY_BE_STALE(gate, false))
}

/**
 * Check a security restriction gate. Always returns the local default.
 */
export async function checkSecurityRestrictionGate(
  gate: string,
): Promise<boolean> {
  return Boolean(getFeatureValue_CACHED_MAY_BE_STALE(gate, false))
}

/**
 * Check a boolean entitlement gate with fallback-to-blocking semantics.
 * Returns the local default immediately in the fork.
 */
export async function checkGate_CACHED_OR_BLOCKING(
  gate: string,
): Promise<boolean> {
  return Boolean(getFeatureValue_CACHED_MAY_BE_STALE(gate, false))
}

/**
 * Refresh GrowthBook after auth changes. No-op in the fork.
 */
export function refreshGrowthBookAfterAuthChange(): void {
  // No-op.
}

/**
 * Reset GrowthBook client state. No-op in the fork.
 */
export function resetGrowthBook(): void {
  // No-op.
}

/**
 * Light refresh — re-fetch features from server without recreating client.
 * No-op in the fork.
 */
export async function refreshGrowthBookFeatures(): Promise<void> {
  // No-op.
}

/**
 * Set up periodic refresh of GrowthBook features. No-op in the fork.
 */
export function setupPeriodicGrowthBookRefresh(): void {
  // No-op.
}

/**
 * Stop periodic refresh. No-op in the fork.
 */
export function stopPeriodicGrowthBookRefresh(): void {
  // No-op.
}

/**
 * Initialize GrowthBook client. No-op in the fork — returns null.
 */
export async function initializeGrowthBook(): Promise<null> {
  return null
}

/**
 * Get a dynamic config value - blocks until GrowthBook is initialized.
 * In the fork this is a sync call to the local default map.
 */
export async function getDynamicConfig_BLOCKS_ON_INIT<T>(
  configName: string,
  defaultValue: T,
): Promise<T> {
  return getFeatureValue_CACHED_MAY_BE_STALE(configName, defaultValue)
}

/**
 * Get a dynamic config value from the local gate defaults.
 */
export function getDynamicConfig_CACHED_MAY_BE_STALE<T>(
  configName: string,
  defaultValue: T,
): T {
  return getFeatureValue_CACHED_MAY_BE_STALE(configName, defaultValue)
}
