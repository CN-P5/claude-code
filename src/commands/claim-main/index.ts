import type { Command } from '../../commands.js'

const claimMain = {
  type: 'local',
  name: 'claim-main',
  description: '为此机器声明主角色（覆盖当前主机器）',
  supportsNonInteractive: false,
  load: () => import('./claim-main.js'),
} satisfies Command

export default claimMain
