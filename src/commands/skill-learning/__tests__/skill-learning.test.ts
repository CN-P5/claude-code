import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { call } from '../skill-learning.js'
import {
  recordSkillGap,
  saveInstinct,
  createInstinct,
  resolveProjectContext,
} from '../../../services/skillLearning/index.js'

let root: string
const originalEnv = { ...process.env }

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'skill-learning-command-'))
  process.env = { ...originalEnv }
  process.env.CLAUDE_SKILL_LEARNING_HOME = root
  process.env.CLAUDE_CONFIG_DIR = join(root, 'config')
  process.env.SKILL_LEARNING_ENABLED = '1'
})

afterEach(() => {
  process.env = { ...originalEnv }
  rmSync(root, { recursive: true, force: true })
})

describe('skill-learning command', () => {
  test('status reports observations and instincts', async () => {
    const result = await call('status', {} as any)

    expect(result.type).toBe('text')
    if (result.type === 'text') {
      expect(result.value).toMatch(/Skill Learning status|技能学习状态/)
      expect(result.value).toMatch(/Observations: 0|观察: 0/)
    }
  })

  test('promote (no args) prints usage and candidate summary', async () => {
    const result = await call('promote', {} as any)

    expect(result.type).toBe('text')
    if (result.type === 'text') {
      expect(result.value).toMatch(/Promotion candidates|晋升候选/)
      expect(result.value).toContain('promote gap')
      expect(result.value).toContain('promote instinct')
    }
  })

  test('promote gap <key> promotes a pending gap to draft', async () => {
    const project = resolveProjectContext(process.cwd())
    const gap = await recordSkillGap({
      prompt: 'refactor the api gateway',
      cwd: process.cwd(),
      project,
      rootDir: root,
    })
    expect(gap.status).toBe('pending')

    const result = await call(`promote gap ${gap.key}`, {} as any)

    expect(result.type).toBe('text')
    if (result.type === 'text') {
      expect(result.value).toMatch(/Promoted gap|已将差距.*晋升/)
      expect(result.value).toMatch(/status=draft|状态=draft/)
    }
  })

  test('promote gap <unknown-key> reports not found', async () => {
    const result = await call('promote gap does-not-exist', {} as any)
    expect(result.type).toBe('text')
    if (result.type === 'text') {
      expect(result.value).toMatch(/No gap found|未找到键为/)
    }
  })

  test('promote instinct <id> copies a project instinct to global scope', async () => {
    const project = resolveProjectContext(process.cwd())
    const instinct = createInstinct({
      trigger: 'when committing',
      action: 'run tests first',
      confidence: 0.85,
      domain: 'testing',
      source: 'session-observation',
      scope: 'project',
      projectId: project.projectId,
      projectName: project.projectName,
      evidence: ['observed twice'],
    })
    await saveInstinct(instinct, { project, rootDir: root })

    const result = await call(`promote instinct ${instinct.id}`, {} as any)

    expect(result.type).toBe('text')
    if (result.type === 'text') {
      expect(result.value).toMatch(/Promoted instinct|已将直觉.*晋升/)
      expect(result.value).toMatch(/global scope|全局作用域/)
    }
  })

  test('projects lists known project scopes', async () => {
    // Resolving once registers the current project in the registry.
    resolveProjectContext(root)

    const result = await call('projects', {} as any)

    expect(result.type).toBe('text')
    if (result.type === 'text') {
      expect(
        result.value.includes('Known project scopes') ||
          result.value.includes('No known project scopes') ||
          result.value.includes('已知项目作用域') ||
          result.value.includes('尚无已知项目作用域'),
      ).toBe(true)
    }
  })

  test('default help mentions promote and projects, no write-fixture', async () => {
    const result = await call('unknown-sub', {} as any)
    expect(result.type).toBe('text')
    if (result.type === 'text') {
      expect(result.value).toContain('promote')
      expect(result.value).toContain('projects')
      expect(result.value).not.toContain('write-fixture')
    }
  })

  test('ingest imports transcript observations and instincts', async () => {
    const transcript = join(root, 'session.jsonl')
    writeFileSync(
      transcript,
      JSON.stringify({
        type: 'user',
        sessionId: 's1',
        cwd: root,
        message: { role: 'user', content: '不要 mock，用 testing-library' },
      }) + '\n',
    )

    // Pass --min-session-length=0 so the 1-line test transcript is not skipped
    // by the ECC-parity gate (default threshold: 10 observations).
    const result = await call(
      `ingest ${transcript} --min-session-length=0`,
      {} as any,
    )

    expect(result.type).toBe('text')
    if (result.type === 'text') {
      expect(result.value).toMatch(/Ingested|已摄取/)
      expect(result.value).toMatch(/saved 1 instincts|保存 1 条直觉/)
    }
  })
})
