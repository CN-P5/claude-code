/**
 * Application initialization (fork: telemetry stripped).
 *
 * Compared to the upstream version, the following have been removed
 * (they are nonessential analytics/telemetry sinks disabled in the
 * fork):
 *   - 1P event logging
 *   - GrowthBook refresh
 *   - Sentry error reporting
 *   - Langfuse tracing
 *   - Remote managed settings loading
 *   - Policy limits loading
 *   - Beta tracing
 *   - Customer telemetry initialization
 *
 * Public surface is preserved so main.tsx / other entrypoints still
 * import `init` and `initializeTelemetryAfterTrust` without changes.
 */

import { profileCheckpoint } from '../utils/startupProfiler.js'
import '../bootstrap/state.js'
import '../utils/config.js'
import memoize from 'lodash-es/memoize.js'
import { getIsNonInteractiveSession } from 'src/bootstrap/state.js'
import { shutdownLspServerManager } from '../services/lsp/manager.js'
import { populateOAuthAccountInfoIfNeeded } from '../services/oauth/client.js'
import { preconnectAnthropicApi } from '../utils/apiPreconnect.js'
import { applyExtraCACertsFromConfig } from '../utils/caCertsConfig.js'
import { registerCleanup } from '../utils/cleanupRegistry.js'
import {
  enableConfigs,
  getGlobalConfig,
  recordFirstStartTime,
  saveGlobalConfig,
} from '../utils/config.js'
import { logForDebugging } from '../utils/debug.js'
import { detectCurrentRepository } from '../utils/detectRepository.js'
import { logForDiagnosticsNoPII } from '../utils/diagLogs.js'
import { initJetBrainsDetection } from '../utils/envDynamic.js'
import { isEnvTruthy } from '../utils/envUtils.js'
import { ConfigParseError } from '../utils/errors.js'
import {
  gracefulShutdownSync,
  setupGracefulShutdown,
} from '../utils/gracefulShutdown.js'
import { applySafeConfigEnvironmentVariables } from '../utils/managedEnv.js'
import { configureGlobalMTLS } from '../utils/mtls.js'
import {
  ensureScratchpadDir,
  isScratchpadEnabled,
} from '../utils/permissions/filesystem.js'
import { configureGlobalAgents } from '../utils/proxy.js'
import { setShellIfWindows } from '../utils/windowsPaths.js'
import { initUser } from '../utils/user.js'
import { setThemeConfigCallbacks } from '@anthropic/ink'

export const init = memoize(async (): Promise<void> => {
  const initStartTime = Date.now()
  logForDiagnosticsNoPII('info', 'init_started')
  profileCheckpoint('init_function_start')

  // Validate configs are valid and enable configuration system
  try {
    const configsStart = Date.now()
    enableConfigs()
    setThemeConfigCallbacks({
      loadTheme: () => getGlobalConfig().theme,
      saveTheme: setting =>
        saveGlobalConfig(current => ({ ...current, theme: setting })),
    })
    logForDiagnosticsNoPII('info', 'init_configs_enabled', {
      duration_ms: Date.now() - configsStart,
    })
    profileCheckpoint('init_configs_enabled')

    // Apply only safe environment variables before trust dialog
    const envVarsStart = Date.now()
    applySafeConfigEnvironmentVariables()

    // Apply NODE_EXTRA_CA_CERTS from settings.json to process.env early,
    // before any TLS connections.
    applyExtraCACertsFromConfig()

    logForDiagnosticsNoPII('info', 'init_safe_env_vars_applied', {
      duration_ms: Date.now() - envVarsStart,
    })
    profileCheckpoint('init_safe_env_vars_applied')

    // Make sure things get flushed on exit
    setupGracefulShutdown()
    profileCheckpoint('init_after_graceful_shutdown')

    // 1P event logging removed (no analytics pipeline in the fork).

    // Start balance polling (no-op unless a provider is configured via env).
    void import('../services/providerUsage/balance/poller.js').then(m =>
      m.startBalancePolling(),
    )
    profileCheckpoint('init_after_balance_polling')

    // Populate OAuth account info if it is not already cached in config.
    void populateOAuthAccountInfoIfNeeded()
    profileCheckpoint('init_after_oauth_populate')

    // Initialize JetBrains IDE detection asynchronously.
    void initJetBrainsDetection()
    profileCheckpoint('init_after_jetbrains_detection')

    // Detect GitHub repository asynchronously.
    void detectCurrentRepository()

    // Remote settings / policy limits / beta tracing initialization removed.

    // Record the first start time
    recordFirstStartTime()

    // Configure global mTLS settings
    const mtlsStart = Date.now()
    logForDebugging('[init] configureGlobalMTLS starting')
    configureGlobalMTLS()
    logForDiagnosticsNoPII('info', 'init_mtls_configured', {
      duration_ms: Date.now() - mtlsStart,
    })
    logForDebugging('[init] configureGlobalMTLS complete')

    // Configure global HTTP agents (proxy and/or mTLS)
    const proxyStart = Date.now()
    logForDebugging('[init] configureGlobalAgents starting')
    configureGlobalAgents()
    logForDiagnosticsNoPII('info', 'init_proxy_configured', {
      duration_ms: Date.now() - proxyStart,
    })
    logForDebugging('[init] configureGlobalAgents complete')
    profileCheckpoint('init_network_configured')

    // Sentry / Langfuse initialization removed (observability vendors
    // disabled in the fork).

    // Pre-warm user email cache (still used by langfuse traces upstream,
    // but we keep the call to populate the user cache for any other
    // code that reads it).
    await initUser()

    // Preconnect to the Anthropic API.
    preconnectAnthropicApi()

    // CCR upstreamproxy (only when CLAUDE_CODE_REMOTE is set).
    if (isEnvTruthy(process.env.CLAUDE_CODE_REMOTE)) {
      try {
        const { initUpstreamProxy, getUpstreamProxyEnv } = await import(
          '../upstreamproxy/upstreamproxy.js'
        )
        const { registerUpstreamProxyEnvFn } = await import(
          '../utils/subprocessEnv.js'
        )
        registerUpstreamProxyEnvFn(getUpstreamProxyEnv)
        await initUpstreamProxy()
      } catch (err) {
        logForDebugging(
          `[init] upstreamproxy init failed: ${err instanceof Error ? err.message : String(err)}; continuing without proxy`,
          { level: 'warn' },
        )
      }
    }

    // Set up git-bash if relevant
    setShellIfWindows()

    // Register LSP manager cleanup.
    registerCleanup(shutdownLspServerManager)

    // gh-32730: teams created by subagents cleanup.
    registerCleanup(async () => {
      const { cleanupSessionTeams } = await import(
        '../utils/swarm/teamHelpers.js'
      )
      await cleanupSessionTeams()
    })

    // Initialize scratchpad directory if enabled
    if (isScratchpadEnabled()) {
      const scratchpadStart = Date.now()
      await ensureScratchpadDir()
      logForDiagnosticsNoPII('info', 'init_scratchpad_created', {
        duration_ms: Date.now() - scratchpadStart,
      })
    }

    logForDiagnosticsNoPII('info', 'init_completed', {
      duration_ms: Date.now() - initStartTime,
    })
    profileCheckpoint('init_function_end')
  } catch (error) {
    if (error instanceof ConfigParseError) {
      if (getIsNonInteractiveSession()) {
        process.stderr.write(
          `Configuration error in ${error.filePath}: ${error.message}\n`,
        )
        gracefulShutdownSync(1)
        return
      }

      return import('../components/InvalidConfigDialog.js').then(m =>
        m.showInvalidConfigDialog({ error }),
      )
    } else {
      throw error
    }
  }
})

/**
 * Initialize telemetry after trust has been granted.
 *
 * No-op in the fork — there is no telemetry pipeline. The function is
 * preserved so callers (e.g. interactiveHelpers.tsx) that schedule it
 * via setImmediate() keep compiling.
 */
export function initializeTelemetryAfterTrust(): void {
  // No-op: telemetry pipeline is disabled in the fork.
  // 1P event logging, GrowthBook refresh, Sentry, Langfuse, customer
  // OTEL exporters — all stripped. See the top-of-file note.
}
