/**
 * Plugin fetch telemetry — stubbed for fork deployment.
 *
 * The original implementation logged `tengu_plugin_remote_fetch`
 * events for every plugin/marketplace fetch (install counts, git
 * clone/pull, plugin clone, mcpb). In the fork there is no analytics
 * pipeline — both `logPluginFetch` and `classifyFetchError` are
 * no-ops / pure utilities.
 *
 * The `PluginFetchSource` / `PluginFetchOutcome` types are kept for
 * source-compat with the 4 consumer files (pluginLoader, mcpbHandler,
 * marketplaceManager, installCounts).
 */

export type PluginFetchSource =
  | 'install_counts'
  | 'marketplace_clone'
  | 'marketplace_pull'
  | 'marketplace_url'
  | 'plugin_clone'
  | 'mcpb'

export type PluginFetchOutcome = 'success' | 'failure' | 'cache_hit'

/**
 * Stub for the analytics event. No-op in the fork.
 */
export function logPluginFetch(
  _source: PluginFetchSource,
  _urlOrSpec: string | undefined,
  _outcome: PluginFetchOutcome,
  _durationMs: number,
  _errorKind?: string,
): void {
  // No-op: telemetry is disabled in the fork.
}

/**
 * Classify an error into a stable bucket for the error_kind field.
 *
 * Pure utility — preserved so callers don't have to inline the
 * regex categorization at every call site. The fork still benefits
 * from having a stable "error kind" label for any local logging.
 */
export function classifyFetchError(error: unknown): string {
  const msg = String((error as { message?: unknown })?.message ?? error)
  if (
    /ENOTFOUND|ECONNREFUSED|EAI_AGAIN|Could not resolve host|Connection refused/i.test(
      msg,
    )
  ) {
    return 'dns_or_refused'
  }
  if (/ETIMEDOUT|timed out|timeout/i.test(msg)) return 'timeout'
  if (
    /ECONNRESET|socket hang up|Connection reset by peer|remote end hung up/i.test(
      msg,
    )
  ) {
    return 'conn_reset'
  }
  if (/403|401|authentication|permission denied/i.test(msg)) return 'auth'
  if (/404|not found|repository not found/i.test(msg)) return 'not_found'
  if (/certificate|SSL|TLS|unable to get local issuer/i.test(msg)) return 'tls'
  if (/Invalid response format|Invalid marketplace schema/i.test(msg)) {
    return 'invalid_schema'
  }
  return 'other'
}
