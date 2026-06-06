/**
 * Local installation path helpers (detection only — auto-updater
 * install/update functions have been removed).
 */

import { existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { getClaudeConfigHomeDir } from './envUtils.js'

function getLocalInstallDir(): string {
  return join(getClaudeConfigHomeDir(), 'local')
}

export function getLocalClaudePath(): string {
  return join(getLocalInstallDir(), 'claude')
}

/**
 * Check if the legacy npm-local installation directory exists.
 * Used by `claude doctor` to flag dual-installations.
 */
export async function localInstallationExists(): Promise<boolean> {
  return existsSync(join(homedir(), '.claude', 'local'))
}

/**
 * Check if we're running from our managed local installation
 */
export function isRunningFromLocalInstallation(): boolean {
  const execPath = process.argv[1] || ''
  return execPath.includes('/.claude/local/node_modules/')
}

export type ShellType =
  | 'bash'
  | 'zsh'
  | 'fish'
  | 'powershell'
  | 'cmd'
  | 'unknown'

/**
 * Detect the user's shell type from process.env.
 * Used for shell completion and config integration.
 */
export function getShellType(): ShellType {
  if (process.platform === 'win32') {
    if (process.env.SHELL?.includes('pwsh') || process.env.PSModulePath) {
      return 'powershell'
    }
    if (process.env.ComSpec?.toLowerCase().includes('powershell')) {
      return 'powershell'
    }
    return 'cmd'
  }

  const shell = process.env.SHELL?.split('/').pop() ?? ''
  if (shell === 'bash') return 'bash'
  if (shell === 'zsh') return 'zsh'
  if (shell === 'fish') return 'fish'
  return 'unknown'
}
