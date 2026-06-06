import { join } from 'node:path'
import type { LocalCommandCall } from '../../types/command.js'
import { getClaudeConfigHomeDir } from '../../utils/envUtils.js'
import {
  analyzeObservations,
  applySkillLifecycleDecision,
  compareExistingSkills,
  decideSkillLifecycle,
  exportInstincts,
  findPromotionCandidates,
  generateSkillCandidates,
  ingestTranscript,
  listKnownProjects,
  loadInstincts,
  promoteGapToDraft,
  prunePendingInstincts,
  readObservations,
  readSkillGaps,
  resolveProjectContext,
  saveInstinct,
  upsertInstinct,
} from '../../services/skillLearning/index.js'

export const call: LocalCommandCall = async (
  args,
): Promise<{ type: 'text'; value: string }> => {
  const parts = args.trim().split(/\s+/).filter(Boolean)
  const sub = parts[0] ?? 'status'
  const project = resolveProjectContext(process.cwd())
  const rootDir = process.env.CLAUDE_SKILL_LEARNING_HOME
  const options = { project, rootDir }

  switch (sub) {
    case 'status': {
      const [observations, instincts] = await Promise.all([
        readObservations(options),
        loadInstincts(options),
      ])
      return {
        type: 'text',
        value: [
          `${project.projectName}（${project.projectId}）的技能学习状态`,
          `观察: ${observations.length}`,
          `直觉: ${instincts.length}`,
        ].join('\n'),
      }
    }
    case 'ingest': {
      const transcript = parts[1]
      if (!transcript) {
        return {
          type: 'text',
          value:
            '用法: /skill-learning ingest <transcript.jsonl> [--min-session-length=<n>]',
        }
      }
      const minSessionLength = parseFlagNumber(
        parts,
        '--min-session-length',
        10,
      )
      const observations = await ingestTranscript(transcript, options)
      if (observations.length < minSessionLength) {
        return {
          type: 'text',
          value: `会话太短，无法学习（${observations.length} < 最小=${minSessionLength}）。跳过直觉提取。`,
        }
      }
      const instincts = analyzeObservations(observations)
      const saved = []
      for (const instinct of instincts) {
        saved.push(await upsertInstinct(instinct, options))
      }
      return {
        type: 'text',
        value: `已摄取 ${observations.length} 条观察并保存 ${saved.length} 条直觉。`,
      }
    }
    case 'evolve': {
      const generate = parts.includes('--generate')
      const instincts = await loadInstincts(options)
      const drafts = generateSkillCandidates(instincts, { cwd: process.cwd() })
      const written = []
      if (generate) {
        for (const draft of drafts) {
          const roots = [
            join(process.cwd(), '.claude', 'skills'),
            join(getClaudeConfigHomeDir(), 'skills'),
          ]
          const existing = await compareExistingSkills(draft, roots)
          const decision = decideSkillLifecycle(draft, existing)
          const result = await applySkillLifecycleDecision(decision)
          written.push(
            `${decision.type}: ${result.activePath ?? result.archivedPath ?? result.deletedPath ?? 'no active write'}`,
          )
        }
      }
      return {
        type: 'text',
        value: generate
          ? `已生成 ${written.length} 个学习技能：\n${written.join('\n')}`
          : `找到 ${drafts.length} 个技能候选。使用 --generate 来写入它们。`,
      }
    }
    case 'export': {
      const output = parts[1] ?? 'skill-learning-instincts.json'
      const scope = parseFlagString(parts, '--scope')
      const minConf = parseFlagNumber(parts, '--min-conf', undefined)
      const domain = parseFlagString(parts, '--domain')
      const filter = (instincts: Awaited<ReturnType<typeof loadInstincts>>) =>
        instincts.filter(i => {
          if (scope && i.scope !== scope) return false
          if (minConf !== undefined && i.confidence < minConf) return false
          if (domain && i.domain !== domain) return false
          return true
        })
      const all = await loadInstincts(options)
      const filtered = filter(all)
      if (filtered.length !== all.length) {
        await exportInstincts(output, options)
        // Re-write with filtered payload to honor filter args.
        const { writeFile } = await import('node:fs/promises')
        await writeFile(output, `${JSON.stringify(filtered, null, 2)}\n`)
      } else {
        await exportInstincts(output, options)
      }
      const parts2: string[] = [`已导出 ${filtered.length} 条直觉到 ${output}`]
      if (scope || minConf !== undefined || domain) {
        const filters: string[] = []
        if (scope) filters.push(`scope=${scope}`)
        if (minConf !== undefined) filters.push(`min-conf=${minConf}`)
        if (domain) filters.push(`domain=${domain}`)
        parts2.push(`（筛选条件: ${filters.join(', ')}）`)
      }
      return { type: 'text', value: parts2.join(' ') }
    }
    case 'import': {
      const input = parts[1]
      if (!input) {
        return {
          type: 'text',
          value:
            '用法: /skill-learning import <instincts.json> [--scope=<scope>] [--min-conf=<n>] [--domain=<d>] [--dry-run]',
        }
      }
      const scope = parseFlagString(parts, '--scope')
      const minConf = parseFlagNumber(parts, '--min-conf', undefined)
      const domain = parseFlagString(parts, '--domain')
      const dryRun = parts.includes('--dry-run')
      // Read + filter first so --dry-run can truly skip persistence. The
      // previous `importInstincts(...)` call wrote to disk before branching
      // on --dry-run, which defeated the purpose of the flag.
      const { readFile: readFileFs } = await import('node:fs/promises')
      const parsed = JSON.parse(await readFileFs(input, 'utf8')) as Awaited<
        ReturnType<typeof loadInstincts>
      >
      const filtered = parsed.filter(i => {
        if (scope && i.scope !== scope) return false
        if (minConf !== undefined && i.confidence < minConf) return false
        if (domain && i.domain !== domain) return false
        return true
      })
      if (dryRun) {
        return {
          type: 'text',
          value: `试运行: 将导入 ${filtered.length}/${parsed.length} 条直觉。`,
        }
      }
      for (const instinct of filtered) {
        await upsertInstinct(instinct, options)
      }
      return {
        type: 'text',
        value: `已导入 ${filtered.length}/${parsed.length} 条直觉。`,
      }
    }
    case 'prune': {
      const maxAgeIndex = parts.indexOf('--max-age')
      const maxAge =
        maxAgeIndex >= 0 && parts[maxAgeIndex + 1]
          ? Number(parts[maxAgeIndex + 1])
          : 30
      const pruned = await prunePendingInstincts(maxAge, options)
      return {
        type: 'text',
        value: `已清理 ${pruned.length} 条待处理直觉。`,
      }
    }
    case 'promote': {
      const target = parts[1]
      if (!target) {
        const gaps = await readSkillGaps(project, rootDir)
        const instincts = await loadInstincts(options)
        const candidates = findPromotionCandidates(instincts)
        const lines = [
          `${project.projectName}（${project.projectId}）的晋升候选：`,
          `待处理差距: ${gaps.filter(g => g.status === 'pending').length}`,
          `全局合格直觉（>=2 个项目，平均置信度 >=0.8）: ${candidates.length}`,
          '',
          '用法:',
          '  /skill-learning promote gap <gap-key>           # 待处理差距 -> 草稿',
          '  /skill-learning promote instinct <instinct-id>  # 项目直觉 -> 全局',
        ]
        return { type: 'text', value: lines.join('\n') }
      }

      if (target === 'gap') {
        const gapKey = parts[2]
        if (!gapKey) {
          return {
            type: 'text',
            value: `用法: /skill-learning promote gap <gap-key>`,
          }
        }
        const updated = await promoteGapToDraft(gapKey, project, rootDir)
        if (!updated) {
          return { type: 'text', value: `未找到键为 "${gapKey}" 的差距。` }
        }
        return {
          type: 'text',
          value: `已将差距 ${gapKey} 晋升为状态=${updated.status}（草稿=${updated.draft?.skillPath ?? '无'}）。`,
        }
      }

      if (target === 'instinct') {
        const instinctId = parts[2]
        if (!instinctId) {
          return {
            type: 'text',
            value: `用法: /skill-learning promote instinct <instinct-id>`,
          }
        }
        const projectInstincts = await loadInstincts(options)
        const match = projectInstincts.find(i => i.id === instinctId)
        if (!match) {
          return {
            type: 'text',
            value: `未找到 ID 为 "${instinctId}" 的项目级直觉。`,
          }
        }
        if (match.scope === 'global') {
          return {
            type: 'text',
            value: `直觉 ${instinctId} 已经是全局作用域。`,
          }
        }
        const globalCopy = { ...match, scope: 'global' as const }
        await saveInstinct(globalCopy, { scope: 'global', rootDir })
        return {
          type: 'text',
          value: `已将直觉 ${instinctId} 晋升为全局作用域。`,
        }
      }

      return {
        type: 'text',
        value:
          '用法: /skill-learning promote [gap <gap-key>|instinct <instinct-id>]',
      }
    }
    case 'projects': {
      const projects = listKnownProjects()
      if (projects.length === 0) {
        return { type: 'text', value: '尚无已知项目作用域。' }
      }
      const lines = ['已知项目作用域：']
      for (const record of projects) {
        const projectOptions = { project: record, rootDir }
        const [instincts, observations] = await Promise.all([
          loadInstincts(projectOptions),
          readObservations(projectOptions),
        ])
        lines.push(
          `- ${record.projectName} (${record.projectId}) — instincts: ${instincts.length}, observations: ${observations.length}, lastSeen: ${record.lastSeenAt}`,
        )
      }
      return { type: 'text', value: lines.join('\n') }
    }
    default:
      return {
        type: 'text',
        value:
          '用法: /skill-learning [status|ingest|evolve|export|import|prune|promote|projects]',
      }
  }
}

function parseFlagString(parts: string[], flag: string): string | undefined {
  const eqForm = parts.find(p => p.startsWith(`${flag}=`))
  if (eqForm) return eqForm.slice(flag.length + 1) || undefined
  const idx = parts.indexOf(flag)
  if (idx >= 0 && parts[idx + 1] && !parts[idx + 1].startsWith('--')) {
    return parts[idx + 1]
  }
  return undefined
}

function parseFlagNumber<T extends number | undefined>(
  parts: string[],
  flag: string,
  fallback: T,
): number | T {
  const raw = parseFlagString(parts, flag)
  if (raw === undefined) return fallback
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}
