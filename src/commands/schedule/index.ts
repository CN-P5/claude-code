import type { Command } from '../../types/command.js'

const scheduleCommand: Command = {
  type: 'local-jsx',
  // Primary name renamed from 'schedule' → 'triggers' to avoid collision
  // with the upstream bundled skill `src/skills/bundled/scheduleRemoteAgents.ts`,
  // which also registers as `/schedule`. The new name matches the underlying
  // API endpoint (`/v1/code/triggers`). Directory still named schedule/ to
  // keep the rename minimal — only the user-facing slash name changes.
  name: 'triggers',
  aliases: ['cron'],
  description:
    '管理定时远程代理触发器（云端 cron）。需要 Claude Pro/Max/Team 订阅。',
  // REPL markdown renderer strips `<...>` as HTML tags — use uppercase.
  argumentHint:
    'list | get ID | create CRON PROMPT | update ID FIELD VALUE | delete ID | run ID | enable ID | disable ID',
  isHidden: false,
  isEnabled: () => true,
  bridgeSafe: false,
  availability: ['claude-ai'],
  load: async () => {
    const m = await import('./launchSchedule.js')
    return { call: m.callSchedule }
  },
}

export default scheduleCommand
