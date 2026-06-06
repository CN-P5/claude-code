import type { Command } from '../types/command.js'

const autonomy = {
  type: 'local-jsx',
  name: 'autonomy',
  description: '查看为 proactive tick 和定时任务记录的自动 autonomy 运行',
  argumentHint:
    '[status [--deep]|runs [limit]|flows [limit]|flow <id>|flow cancel <id>|flow resume <id>]',
  load: () => import('./autonomyPanel.js'),
} satisfies Command

export default autonomy
