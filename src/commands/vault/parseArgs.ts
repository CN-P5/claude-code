/**
 * Parse the args string for the /vault command.
 *
 * Supported sub-commands:
 *   list                                         → { action: 'list' }
 *   create <name>                                → { action: 'create', name }
 *   get <id>                                     → { action: 'get', id }
 *   archive <id>                                 → { action: 'archive', id }
 *   add-credential <vault_id> <key> <value>      → { action: 'add-credential', vaultId, key, secret }
 *   archive-credential <vault_id> <cred_id>      → { action: 'archive-credential', vaultId, credentialId }
 *   (empty)                                      → { action: 'list' }
 *   anything else                                → { action: 'invalid', reason }
 */

export type VaultArgs =
  | { action: 'list' }
  | { action: 'create'; name: string }
  | { action: 'get'; id: string }
  | { action: 'archive'; id: string }
  | {
      action: 'add-credential'
      vaultId: string
      key: string
      secret: string
    }
  | { action: 'archive-credential'; vaultId: string; credentialId: string }
  | { action: 'invalid'; reason: string }

const USAGE =
  'Usage: /vault list | create NAME | get ID | archive ID | add-credential VAULT_ID KEY VALUE | archive-credential VAULT_ID CRED_ID'

export function parseVaultArgs(args: string): VaultArgs {
  const trimmed = args.trim()

  if (trimmed === '' || trimmed === 'list') {
    return { action: 'list' }
  }

  const spaceIdx = trimmed.indexOf(' ')
  const subCmd = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)
  const rest = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim()

  // ── create ────────────────────────────────────────────────────────────────
  if (subCmd === 'create') {
    if (!rest) {
      return {
        action: 'invalid',
        reason: 'create 需要保险库名称，例如 create "My Work Vault"',
      }
    }
    return { action: 'create', name: rest }
  }

  // ── get ───────────────────────────────────────────────────────────────────
  if (subCmd === 'get') {
    if (!rest) {
      return { action: 'invalid', reason: 'get 需要保险库 ID' }
    }
    const id = rest.split(/\s+/)[0]
    /* istanbul ignore next */
    if (!id) {
      return { action: 'invalid', reason: 'get 需要保险库 ID' }
    }
    return { action: 'get', id }
  }

  // ── archive ───────────────────────────────────────────────────────────────
  if (subCmd === 'archive') {
    if (!rest) {
      return { action: 'invalid', reason: 'archive 需要保险库 ID' }
    }
    const id = rest.split(/\s+/)[0]
    /* istanbul ignore next */
    if (!id) {
      return { action: 'invalid', reason: 'archive 需要保险库 ID' }
    }
    return { action: 'archive', id }
  }

  // ── add-credential ────────────────────────────────────────────────────────
  if (subCmd === 'add-credential') {
    const parts = rest.split(/\s+/)
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      return {
        action: 'invalid',
        reason:
          'add-credential 需要 vault_id、key 和 value，例如 add-credential vault_123 MY_API_KEY <value>',
      }
    }
    const vaultId = parts[0]
    const key = parts[1]
    const secret = parts.slice(2).join(' ')
    if (!secret.trim()) {
      return {
        action: 'invalid',
        reason: 'add-credential 需要非空的凭据值',
      }
    }
    return {
      action: 'add-credential',
      vaultId,
      key,
      secret: secret.trim(),
    }
  }

  // ── archive-credential ────────────────────────────────────────────────────
  if (subCmd === 'archive-credential') {
    const parts = rest.split(/\s+/)
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      return {
        action: 'invalid',
        reason:
          'archive-credential 需要 vault_id 和 credential_id，例如 archive-credential vault_123 cred_456',
      }
    }
    return {
      action: 'archive-credential',
      vaultId: parts[0],
      credentialId: parts[1],
    }
  }

  return {
    action: 'invalid',
    reason: `未知子命令 "${subCmd}"。 ${USAGE}`,
  }
}
