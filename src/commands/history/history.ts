import type { LocalCommandCall } from '../../types/command.js'
import { getPipeIpc } from '../../utils/pipeTransport.js'

export const call: LocalCommandCall = async (args, context) => {
  const currentState = context.getAppState()

  if (getPipeIpc(currentState).role !== 'master') {
    return {
      type: 'text',
      value: '未处于主模式。请先使用 /attach <pipe-name>。',
    }
  }

  const parts = args.trim().split(/\s+/)
  const targetName = parts[0]

  if (!targetName) {
    // Show list of connected sub sessions
    const slaveNames = Object.keys(getPipeIpc(currentState).slaves)
    if (slaveNames.length === 0) {
      return { type: 'text', value: '没有已连接的子会话。' }
    }
    return {
      type: 'text',
      value: `用法：/history <pipe-name>\n已连接的子会话：${slaveNames.join(', ')}`,
    }
  }

  const slave = getPipeIpc(currentState).slaves[targetName]
  if (!slave) {
    return {
      type: 'text',
      value: `未连接到 "${targetName}"。使用 /status 查看已连接的子会话。`,
    }
  }

  // Parse --last N
  let limit = slave.history.length
  const lastIdx = parts.indexOf('--last')
  if (lastIdx !== -1 && parts[lastIdx + 1]) {
    const n = parseInt(parts[lastIdx + 1], 10)
    if (!isNaN(n) && n > 0) {
      limit = n
    }
  }

  const entries = slave.history.slice(-limit)

  if (entries.length === 0) {
    return {
      type: 'text',
      value: `"${targetName}" 暂无会话历史。`,
    }
  }

  const lines: string[] = [
    `"${targetName}" 的会话历史（${entries.length}/${slave.history.length} 条记录）：`,
    '',
  ]

  for (const entry of entries) {
    const time = entry.timestamp.slice(11, 19) // HH:MM:SS
    const prefix = formatEntryType(entry.type)
    const content =
      entry.content.length > 200
        ? entry.content.slice(0, 200) + '...'
        : entry.content
    lines.push(`[${time}] ${prefix} ${content}`)
  }

  return { type: 'text', value: lines.join('\n') }
}

function formatEntryType(type: string): string {
  switch (type) {
    case 'prompt':
      return '[PROMPT]'
    case 'prompt_ack':
      return '[ACK]   '
    case 'stream':
      return '[AI]    '
    case 'tool_start':
      return '[TOOL>] '
    case 'tool_result':
      return '[TOOL<] '
    case 'done':
      return '[DONE]  '
    case 'error':
      return '[ERROR] '
    default:
      return `[${type}]`
  }
}
