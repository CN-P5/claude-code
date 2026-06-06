import * as fs from 'node:fs'
import * as path from 'node:path'
import type { Command, LocalCommandCall } from '../types/command.js'
import { detectCurrentRepositoryWithHost } from '../utils/detectRepository.js'
import { getClaudeConfigHomeDir } from '../utils/envUtils.js'

/**
 * File-backed store for PR webhook subscriptions.
 * Each subscription tracks the repo + PR number so the bridge layer
 * (useReplBridge / webhookSanitizer) can filter inbound events.
 */
interface PRSubscription {
  repo: string // "owner/repo"
  prNumber: number
  subscribedAt: string // ISO 8601
}

function getSubscriptionsFilePath(): string {
  return path.join(getClaudeConfigHomeDir(), 'pr-subscriptions.json')
}

function readSubscriptions(): PRSubscription[] {
  const filePath = getSubscriptionsFilePath()
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as PRSubscription[]
  } catch {
    return []
  }
}

function writeSubscriptions(subs: PRSubscription[]): void {
  const filePath = getSubscriptionsFilePath()
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(subs, null, 2), 'utf-8')
}

/**
 * Parse a PR URL or number into { repo, prNumber }.
 *
 * Accepts:
 *   - Full URL:  https://github.com/owner/repo/pull/123
 *   - Short ref: owner/repo#123
 *   - Bare number: 123  (uses the current git repository)
 */
async function parsePRArg(
  arg: string,
): Promise<{ repo: string; prNumber: number } | { error: string }> {
  const trimmed = arg.trim()

  // Full GitHub PR URL
  const urlMatch = trimmed.match(
    /^https?:\/\/[^/]+\/([^/]+\/[^/]+)\/pull\/(\d+)/,
  )
  if (urlMatch) {
    return { repo: urlMatch[1]!, prNumber: parseInt(urlMatch[2]!, 10) }
  }

  // Short ref: owner/repo#123
  const shortMatch = trimmed.match(/^([^/]+\/[^/]+)#(\d+)$/)
  if (shortMatch) {
    return { repo: shortMatch[1]!, prNumber: parseInt(shortMatch[2]!, 10) }
  }

  // Bare number — resolve repo from current git checkout
  const numMatch = trimmed.match(/^#?(\d+)$/)
  if (numMatch) {
    const prNumber = parseInt(numMatch[1]!, 10)
    const detected = await detectCurrentRepositoryWithHost()
    if (!detected) {
      return {
        error: '无法检测当前目录的 GitHub 仓库。请提供完整的 PR URL。',
      }
    }
    const repo = `${detected.owner}/${detected.name}`
    return { repo, prNumber }
  }

  return {
    error: `无法识别的 PR 引用："${trimmed}"。请使用 PR URL、owner/repo#123 或 PR 编号。`,
  }
}

const call: LocalCommandCall = async (args, _context) => {
  const trimmed = args.trim()

  // List current subscriptions
  if (!trimmed || trimmed === '--list' || trimmed === 'list') {
    const subs = readSubscriptions()
    if (subs.length === 0) {
      return {
        type: 'text',
        value: '没有活跃的 PR 订阅。用法：/subscribe-pr <pr-url-or-number>',
      }
    }
    const lines = subs.map(
      s => `  ${s.repo}#${s.prNumber}  (since ${s.subscribedAt})`,
    )
    return {
      type: 'text',
      value: `活跃的 PR 订阅：\n${lines.join('\n')}`,
    }
  }

  // Unsubscribe
  if (trimmed.startsWith('--remove ') || trimmed.startsWith('remove ')) {
    const rest = trimmed.replace(/^(--remove|remove)\s+/, '')
    const parsed = await parsePRArg(rest)
    if ('error' in parsed) {
      return { type: 'text', value: parsed.error }
    }
    const subs = readSubscriptions()
    const before = subs.length
    const after = subs.filter(
      s => !(s.repo === parsed.repo && s.prNumber === parsed.prNumber),
    )
    if (after.length === before) {
      return {
        type: 'text',
        value: `未找到 ${parsed.repo}#${parsed.prNumber} 的订阅。`,
      }
    }
    writeSubscriptions(after)
    return {
      type: 'text',
      value: `已取消订阅 ${parsed.repo}#${parsed.prNumber}。`,
    }
  }

  // Subscribe
  const parsed = await parsePRArg(trimmed)
  if ('error' in parsed) {
    return { type: 'text', value: parsed.error }
  }

  const subs = readSubscriptions()
  const existing = subs.find(
    s => s.repo === parsed.repo && s.prNumber === parsed.prNumber,
  )
  if (existing) {
    return {
      type: 'text',
      value: `已订阅 ${parsed.repo}#${parsed.prNumber}（自 ${existing.subscribedAt} 起）。`,
    }
  }

  subs.push({
    repo: parsed.repo,
    prNumber: parsed.prNumber,
    subscribedAt: new Date().toISOString(),
  })
  writeSubscriptions(subs)

  return {
    type: 'text',
    value: `已订阅 ${parsed.repo}#${parsed.prNumber}。您将收到评论、CI 状态和审查的通知。`,
  }
}

const subscribePr = {
  type: 'local',
  name: 'subscribe-pr',
  aliases: ['watch-pr'],
  description: '订阅 GitHub PR 活动（评论、CI、审查）',
  argumentHint: '<pr-url-or-number>',
  supportsNonInteractive: false,
  isHidden: true,
  load: () => Promise.resolve({ call }),
} satisfies Command

export default subscribePr
