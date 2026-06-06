import type { Command } from '../../commands.js'

export default {
  type: 'local-jsx',
  name: 'usage',
  aliases: ['cost', 'stats'],
  description: '显示会话费用、计划用量和活动统计',
  load: () => import('./usage.js'),
} satisfies Command
