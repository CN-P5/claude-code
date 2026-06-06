/**
 * Plugin auto-update functionality.
 *
 * The background auto-updater (shouldSkipPluginAutoupdate /
 * autoUpdateMarketplacesAndPluginsInBackground) was removed in the
 * auto-updater cleanup. This module retains only the helper used by
 * ManageMarketplaces for manual marketplace-plugin bumping.
 */

import { updatePluginOp } from '../../services/plugins/pluginOperations.js'
import { logForDebugging } from '../debug.js'
import { errorMessage } from '../errors.js'
import { logError } from '../log.js'
import {
  getPendingUpdatesDetails,
  hasPendingUpdates,
  isInstallationRelevantToCurrentProject,
  loadInstalledPluginsFromDisk,
} from './installedPluginsManager.js'
import {
  getDeclaredMarketplaces,
  loadKnownMarketplacesConfig,
  refreshMarketplace,
} from './marketplaceManager.js'
import { parsePluginIdentifier } from './pluginIdentifier.js'
import { isMarketplaceAutoUpdate, type PluginScope } from './schemas.js'

/**
 * Update all project-relevant installed plugins from the given marketplaces.
 *
 * Called by ManageMarketplaces after a manual /plugin marketplace update.
 */
export async function updatePluginsForMarketplaces(
  marketplaceNames: Set<string>,
): Promise<string[]> {
  const installedPlugins = loadInstalledPluginsFromDisk()
  const pluginIds = Object.keys(installedPlugins.plugins)

  if (pluginIds.length === 0) {
    return []
  }

  const results = await Promise.allSettled(
    pluginIds.map(async pluginId => {
      const { marketplace } = parsePluginIdentifier(pluginId)
      if (!marketplace || !marketplaceNames.has(marketplace.toLowerCase())) {
        return null
      }

      const allInstallations = installedPlugins.plugins[pluginId]
      if (!allInstallations || allInstallations.length === 0) {
        return null
      }

      const relevantInstallations = allInstallations.filter(
        isInstallationRelevantToCurrentProject,
      )
      if (relevantInstallations.length === 0) {
        return null
      }

      return updatePlugin(pluginId, relevantInstallations)
    }),
  )

  return results
    .filter(
      (r): r is PromiseFulfilledResult<string> =>
        r.status === 'fulfilled' && r.value !== null,
    )
    .map(r => r.value)
}

async function updatePlugin(
  pluginId: string,
  installations: Array<{ scope: PluginScope; projectPath?: string }>,
): Promise<string | null> {
  let wasUpdated = false

  for (const { scope } of installations) {
    try {
      const result = await updatePluginOp(pluginId, scope)

      if (result.success && !result.alreadyUpToDate) {
        wasUpdated = true
        logForDebugging(
          `Plugin autoupdate: updated ${pluginId} from ${result.oldVersion} to ${result.newVersion}`,
        )
      } else if (!result.alreadyUpToDate) {
        logForDebugging(
          `Plugin autoupdate: failed to update ${pluginId}: ${result.message}`,
          { level: 'warn' },
        )
      }
    } catch (error) {
      logForDebugging(
        `Plugin autoupdate: error updating ${pluginId}: ${errorMessage(error)}`,
        { level: 'warn' },
      )
    }
  }

  return wasUpdated ? pluginId : null
}
