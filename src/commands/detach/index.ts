import type { Command } from '../../commands.js'

const detach = {
  type: 'local',
  name: 'detach',
  description: '断开与子 CLI 的连接（或所有已连接的子 CLI）',
  supportsNonInteractive: false,
  load: () => import('./detach.js'),
} satisfies Command

export default detach
