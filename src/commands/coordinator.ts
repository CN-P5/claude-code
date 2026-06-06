/**
 * /coordinator — Toggle coordinator (multi-worker orchestration) mode.
 *
 * When enabled, the CLI becomes an orchestrator that dispatches tasks
 * to worker agents via Agent({ subagent_type: "worker" }).
 * The coordinator can only use Agent, SendMessage, and TaskStop.
 */
import { feature } from 'bun:bundle'
import type { ToolUseContext } from '../Tool.js'
import type {
  Command,
  LocalJSXCommandContext,
  LocalJSXCommandOnDone,
} from '../types/command.js'

const coordinator = {
  type: 'local-jsx',
  name: 'coordinator',
  description: '切换协调器（多 worker）模式',
  isEnabled: () => {
    if (feature('COORDINATOR_MODE')) {
      return true
    }
    return false
  },
  immediate: true,
  load: () =>
    Promise.resolve({
      async call(
        onDone: LocalJSXCommandOnDone,
        _context: ToolUseContext & LocalJSXCommandContext,
      ): Promise<React.ReactNode> {
        const mod =
          require('../coordinator/coordinatorMode.js') as typeof import('../coordinator/coordinatorMode.js')

        if (mod.isCoordinatorMode()) {
          // Disable: clear the env var
          delete process.env.CLAUDE_CODE_COORDINATOR_MODE
          onDone('协调器模式已禁用 — 返回普通模式', {
            display: 'system',
            metaMessages: [
              '<system-reminder>\n协调器模式现已禁用。你可以再次使用所有标准工具。直接工作而不是分派给 worker。\n</system-reminder>',
            ],
          })
        } else {
          // Enable: set the env var
          process.env.CLAUDE_CODE_COORDINATOR_MODE = '1'
          onDone(
            '协调器模式已启用 — 使用 Agent(subagent_type: "worker") 分派任务',
            {
              display: 'system',
              metaMessages: [
                '<system-reminder>\n协调器模式现已启用。你是一个协调器。使用 Agent({ subagent_type: "worker" }) 来生成 worker，使用 SendMessage 继续它们，使用 TaskStop 停止它们。不要直接使用其他工具。\n</system-reminder>',
              ],
            },
          )
        }
        return null
      },
    }),
} satisfies Command

export default coordinator
