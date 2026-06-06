import type { Command } from '../../commands.js'

const poor = {
  type: 'local',
  name: 'poor',
  description:
    '切换穷鬼模式 — 禁用 extract_memories 和 prompt_suggestion 以节省 token',
  supportsNonInteractive: false,
  load: () => import('./poor.js'),
} satisfies Command

export default poor
