import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { getIsNonInteractiveSession } from '../../bootstrap/state.js'
import { getClaudeConfigHomeDir } from '../../utils/envUtils.js'
import type { Command, LocalCommandResult } from '../../types/command.js'

/**
 * Path to the next-request-no-cache marker file.
 * When this file exists, the main API call path should append a random
 * comment to the system prompt to bust the prefix-cache hash, then delete it.
 *
 * Convention: public so other modules (e.g. claude.ts) can check it.
 */
export function getBreakCacheMarkerPath(): string {
  return join(getClaudeConfigHomeDir(), '.next-request-no-cache')
}

/**
 * Path to the always-on break-cache flag file.
 * When this file exists, EVERY API request gets a cache-busting nonce
 * (instead of just the next one).
 */
export function getBreakCacheAlwaysPath(): string {
  return join(getClaudeConfigHomeDir(), '.break-cache-always')
}

/**
 * Path to the append-only JSONL log that records each cache-break event.
 *
 * Replaces the old read-modify-write stats JSON to avoid lost increments when
 * two concurrent `/break-cache once` invocations race. Each break appends one
 * line; `readStats()` aggregates at read time.
 *
 * Uses getClaudeConfigHomeDir() so that CLAUDE_CONFIG_DIR env var overrides
 * the path in test environments.
 */
export function getBreakCacheStatsPath(): string {
  return join(getClaudeConfigHomeDir(), 'break-cache-events.jsonl')
}

interface BreakCacheStats {
  totalBreaks: number
  lastBreakAt: string | null
  alwaysModeEnabled: boolean
}

interface BreakCacheEvent {
  at: string
  kind: 'once' | 'always_on' | 'always_off'
}

/**
 * Reads stats by aggregating the append-only event log.
 * Because we only append, concurrent writers cannot lose increments.
 */
function readStats(): BreakCacheStats {
  try {
    const raw = readFileSync(getBreakCacheStatsPath(), 'utf8')
    const events = raw
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => {
        try {
          return JSON.parse(line) as BreakCacheEvent
        } catch {
          return null
        }
      })
      .filter((e): e is BreakCacheEvent => e !== null)

    const onceBreaks = events.filter(e => e.kind === 'once')
    const lastEvent = events[events.length - 1]
    const alwaysEvents = events.filter(
      e => e.kind === 'always_on' || e.kind === 'always_off',
    )
    const lastAlways = alwaysEvents[alwaysEvents.length - 1]

    return {
      totalBreaks: onceBreaks.length,
      lastBreakAt: lastEvent?.at ?? null,
      alwaysModeEnabled: lastAlways?.kind === 'always_on',
    }
  } catch {
    return { totalBreaks: 0, lastBreakAt: null, alwaysModeEnabled: false }
  }
}

/**
 * Appends a single event line to the stats log.
 * append is atomic at the OS level for small writes, so concurrent callers
 * cannot overwrite each other's increments.
 */
function appendBreakEvent(kind: BreakCacheEvent['kind']): void {
  const statsPath = getBreakCacheStatsPath()
  mkdirSync(getClaudeConfigHomeDir(), { recursive: true })
  const event: BreakCacheEvent = { at: new Date().toISOString(), kind }
  appendFileSync(statsPath, JSON.stringify(event) + '\n', 'utf8')
}

function incrementBreakCount(): void {
  appendBreakEvent('once')
}

const USAGE_TEXT = [
  '用法: /break-cache [scope]',
  '',
  '  (无参数)         为下一次 API 调用安排一次性缓存中断',
  '  once             同无参数',
  '  always           启用持久缓存中断模式（每次请求）',
  '  off              禁用 always 模式并清除待处理标记',
  '  --clear          清除待处理的 once 标记（在下次调用前取消）',
  '  status           显示当前 break-cache 状态和统计',
  '',
  '工作原理:',
  '  Anthropic 提示缓存基于系统提示前缀哈希作为键。',
  '  唯一的 nonce 会使哈希失效，强制重新计算。',
  '  当你需要确保干净的上下文窗口时，这很有用。',
].join('\n')

export async function callBreakCache(
  args: string,
): Promise<LocalCommandResult> {
  const scope = args.trim().toLowerCase()
  const markerPath = getBreakCacheMarkerPath()
  const alwaysPath = getBreakCacheAlwaysPath()

  // ── status ──
  if (scope === 'status') {
    const stats = readStats()
    const onceActive = existsSync(markerPath)
    const alwaysActive = existsSync(alwaysPath)
    return {
      type: 'text',
      value: [
        '## Break-Cache 状态',
        '',
        `  Once 标记:      ${onceActive ? '已激活（下次调用将中断缓存）' : '未设置'}`,
        `  Always 模式:    ${alwaysActive ? '开启（每次调用都中断缓存）' : '关闭'}`,
        '',
        '## 统计',
        `  total_breaks:   ${stats.totalBreaks}`,
        `  last_break_at:  ${stats.lastBreakAt ?? 'never'}`,
      ].join('\n'),
    }
  }

  // ── off ──
  if (scope === 'off') {
    let cleared = false
    if (existsSync(markerPath)) {
      unlinkSync(markerPath)
      cleared = true
    }
    if (existsSync(alwaysPath)) {
      unlinkSync(alwaysPath)
      cleared = true
    }
    appendBreakEvent('always_off')
    return {
      type: 'text',
      value: cleared
        ? 'Break-cache 已禁用。已移除 once 标记和/或 always 标志。'
        : 'Break-cache 未处于活跃状态。',
    }
  }

  // ── --clear ──
  if (scope === '--clear') {
    if (existsSync(markerPath)) {
      unlinkSync(markerPath)
      return {
        type: 'text',
        value: `缓存中断标记已清除。\n  \`${markerPath}\``,
      }
    }
    return {
      type: 'text',
      value: '未设置缓存中断标记。',
    }
  }

  // ── always ──
  if (scope === 'always') {
    writeFileSync(alwaysPath, new Date().toISOString(), 'utf8')
    appendBreakEvent('always_on')
    return {
      type: 'text',
      value: [
        '## 已启用持久缓存中断',
        '',
        `标志已写入: \`${alwaysPath}\``,
        '',
        '每次 API 调用现在都会在系统提示中附加一个随机 nonce，',
        '永久阻止此会话的提示缓存命中。',
        '',
        '要禁用: `/break-cache off`',
      ].join('\n'),
    }
  }

  // ── once (legacy default, or explicit "once") ──
  if (scope === '' || scope === 'once') {
    const timestamp = new Date().toISOString()
    writeFileSync(markerPath, timestamp, 'utf8')
    incrementBreakCount()
    const stats = readStats()

    return {
      type: 'text',
      value: [
        '## 已安排缓存中断',
        '',
        `标记已写入: \`${markerPath}\``,
        `时间戳: ${timestamp}`,
        '',
        '下次 API 调用将在系统提示中附加一个随机 nonce，',
        '导致缓存未命中。标记在使用后会自动移除。',
        '',
        '在下次调用前取消: `/break-cache --clear`',
        '每次调用都中断:         `/break-cache always`',
        '',
        `本次会话总中断次数: ${stats.totalBreaks}`,
        '',
        '_工作原理: Anthropic 提示缓存基于系统提示前缀哈希作为键。_',
        '_唯一的 nonce 会使哈希失效，强制重新计算。_',
      ].join('\n'),
    }
  }

  // ── unknown scope ──
  return {
    type: 'text',
    value: [`Unknown scope: "${scope}"`, '', USAGE_TEXT].join('\n'),
  }
}

const breakCache: Command = {
  type: 'local-jsx',
  name: 'break-cache',
  description:
    '管理提示缓存中断。打开操作面板或运行: once、status、always、off',
  isHidden: false,
  isEnabled: () => !getIsNonInteractiveSession(),
  argumentHint: '[once|status|always|off|--clear]',
  bridgeSafe: true,
  getBridgeInvocationError: args =>
    args.trim()
      ? undefined
      : 'Use /break-cache once/status/always/off over Remote Control.',
  load: () => import('./panel.js'),
}

export const breakCacheNonInteractive: Command = {
  type: 'local',
  name: 'break-cache',
  description:
    '强制下一次（或所有）API 调用未命中提示缓存。范围: once、status、always、off',
  isHidden: false,
  isEnabled: () => getIsNonInteractiveSession(),
  supportsNonInteractive: true,
  bridgeSafe: true,
  load: async () => ({
    call: callBreakCache,
  }),
}

export default breakCache
