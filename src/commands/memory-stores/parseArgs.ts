/**
 * Parse the args string for the /memory-stores command.
 *
 * Supported sub-commands:
 *   list                                         → { action: 'list' }
 *   get <id>                                     → { action: 'get', id }
 *   create <name>                                → { action: 'create', name }
 *   archive <id>                                 → { action: 'archive', id }
 *   memories <store_id>                          → { action: 'memories', storeId }
 *   create-memory <store_id> <content>           → { action: 'create-memory', storeId, content }
 *   get-memory <store_id> <memory_id>            → { action: 'get-memory', storeId, memoryId }
 *   update-memory <store_id> <memory_id> <content> → { action: 'update-memory', storeId, memoryId, content }
 *   delete-memory <store_id> <memory_id>         → { action: 'delete-memory', storeId, memoryId }
 *   versions <store_id>                          → { action: 'versions', storeId }
 *   redact <store_id> <version_id>               → { action: 'redact', storeId, versionId }
 *   (empty)                                      → { action: 'list' }
 *   anything else                                → { action: 'invalid', reason }
 */

export type MemoryStoresArgs =
  | { action: 'list' }
  | { action: 'get'; id: string }
  | { action: 'create'; name: string }
  | { action: 'archive'; id: string }
  | { action: 'memories'; storeId: string }
  | { action: 'create-memory'; storeId: string; content: string }
  | { action: 'get-memory'; storeId: string; memoryId: string }
  | {
      action: 'update-memory'
      storeId: string
      memoryId: string
      content: string
    }
  | { action: 'delete-memory'; storeId: string; memoryId: string }
  | { action: 'versions'; storeId: string }
  | { action: 'redact'; storeId: string; versionId: string }
  | { action: 'invalid'; reason: string }

const USAGE =
  'Usage: /memory-stores list | get ID | create NAME | archive ID | memories STORE_ID | create-memory STORE_ID CONTENT | get-memory STORE_ID MEMORY_ID | update-memory STORE_ID MEMORY_ID CONTENT | delete-memory STORE_ID MEMORY_ID | versions STORE_ID | redact STORE_ID VERSION_ID'

export function parseMemoryStoresArgs(args: string): MemoryStoresArgs {
  const trimmed = args.trim()

  if (trimmed === '' || trimmed === 'list') {
    return { action: 'list' }
  }

  const spaceIdx = trimmed.indexOf(' ')
  const subCmd = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)
  const rest = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim()

  // ── get ───────────────────────────────────────────────────────────────────
  if (subCmd === 'get') {
    if (!rest) {
      return { action: 'invalid', reason: 'get 需要存储 ID' }
    }
    const id = rest.split(/\s+/)[0]
    /* istanbul ignore next */
    if (!id) {
      return { action: 'invalid', reason: 'get 需要存储 ID' }
    }
    return { action: 'get', id }
  }

  // ── create ────────────────────────────────────────────────────────────────
  if (subCmd === 'create') {
    if (!rest) {
      return {
        action: 'invalid',
        reason: 'create 需要存储名称，例如 create "My Work Store"',
      }
    }
    return { action: 'create', name: rest }
  }

  // ── archive ───────────────────────────────────────────────────────────────
  if (subCmd === 'archive') {
    if (!rest) {
      return { action: 'invalid', reason: 'archive 需要存储 ID' }
    }
    const id = rest.split(/\s+/)[0]
    /* istanbul ignore next */
    if (!id) {
      return { action: 'invalid', reason: 'archive 需要存储 ID' }
    }
    return { action: 'archive', id }
  }

  // ── memories ──────────────────────────────────────────────────────────────
  if (subCmd === 'memories') {
    if (!rest) {
      return { action: 'invalid', reason: 'memories 需要存储 ID' }
    }
    const storeId = rest.split(/\s+/)[0]
    /* istanbul ignore next */
    if (!storeId) {
      return { action: 'invalid', reason: 'memories 需要存储 ID' }
    }
    return { action: 'memories', storeId }
  }

  // ── create-memory ─────────────────────────────────────────────────────────
  if (subCmd === 'create-memory') {
    const parts = rest.split(/\s+/)
    if (parts.length < 2 || !parts[0]) {
      return {
        action: 'invalid',
        reason:
          'create-memory 需要存储 ID 和内容，例如 create-memory ms_123 "The content"',
      }
    }
    const storeId = parts[0]
    const content = parts.slice(1).join(' ')
    if (!content.trim()) {
      return {
        action: 'invalid',
        reason: 'create-memory 需要非空内容',
      }
    }
    return { action: 'create-memory', storeId, content: content.trim() }
  }

  // ── get-memory ────────────────────────────────────────────────────────────
  if (subCmd === 'get-memory') {
    const parts = rest.split(/\s+/)
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      return {
        action: 'invalid',
        reason:
          'get-memory 需要存储 ID 和记忆 ID，例如 get-memory ms_123 mem_456',
      }
    }
    return { action: 'get-memory', storeId: parts[0], memoryId: parts[1] }
  }

  // ── update-memory ─────────────────────────────────────────────────────────
  if (subCmd === 'update-memory') {
    const parts = rest.split(/\s+/)
    if (parts.length < 3 || !parts[0] || !parts[1]) {
      return {
        action: 'invalid',
        reason:
          'update-memory 需要存储 ID、记忆 ID 和内容，例如 update-memory ms_123 mem_456 "New content"',
      }
    }
    const storeId = parts[0]
    const memoryId = parts[1]
    const content = parts.slice(2).join(' ')
    if (!content.trim()) {
      return {
        action: 'invalid',
        reason: 'update-memory 需要非空内容',
      }
    }
    return {
      action: 'update-memory',
      storeId,
      memoryId,
      content: content.trim(),
    }
  }

  // ── delete-memory ─────────────────────────────────────────────────────────
  if (subCmd === 'delete-memory') {
    const parts = rest.split(/\s+/)
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      return {
        action: 'invalid',
        reason:
          'delete-memory 需要存储 ID 和记忆 ID，例如 delete-memory ms_123 mem_456',
      }
    }
    return { action: 'delete-memory', storeId: parts[0], memoryId: parts[1] }
  }

  // ── versions ──────────────────────────────────────────────────────────────
  if (subCmd === 'versions') {
    if (!rest) {
      return { action: 'invalid', reason: 'versions 需要存储 ID' }
    }
    const storeId = rest.split(/\s+/)[0]
    /* istanbul ignore next */
    if (!storeId) {
      return { action: 'invalid', reason: 'versions 需要存储 ID' }
    }
    return { action: 'versions', storeId }
  }

  // ── redact ────────────────────────────────────────────────────────────────
  if (subCmd === 'redact') {
    const parts = rest.split(/\s+/)
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      return {
        action: 'invalid',
        reason: 'redact 需要存储 ID 和版本 ID，例如 redact ms_123 ver_456',
      }
    }
    return { action: 'redact', storeId: parts[0], versionId: parts[1] }
  }

  return {
    action: 'invalid',
    reason: `未知子命令 "${subCmd}"。 ${USAGE}`,
  }
}
