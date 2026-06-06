import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getIsNonInteractiveSession } from '../../bootstrap/state.js'
import { getClaudeConfigHomeDir } from '../../utils/envUtils.js'
import type { Command, LocalCommandResult } from '../../types/command.js'

/**
 * Path to the TUI-mode marker file.
 *
 * When this file exists, the user has opted in to flicker-free TUI mode
 * (alternate screen buffer via CLAUDE_CODE_NO_FLICKER=1). The marker is
 * session-independent: it persists across restarts so the user only needs to
 * run `/tui on` once.
 *
 * Shell-profile integration: add the following to ~/.bashrc / ~/.zshrc to
 * auto-enable TUI mode when the marker is present:
 *
 *   [ -f "$HOME/.claude/.tui-mode" ] && export CLAUDE_CODE_NO_FLICKER=1
 *
 * Note: setting CLAUDE_CODE_NO_FLICKER at runtime cannot retroactively enter
 * the alternate screen buffer — the Ink render tree is already mounted. The
 * change takes effect on the NEXT session start.
 */
export function getTuiMarkerPath(): string {
  return join(getClaudeConfigHomeDir(), '.tui-mode')
}

/**
 * Returns true when the TUI-mode marker file is present, meaning the user has
 * opted in to flicker-free alternate-screen rendering.
 */
export function isTuiModeEnabled(): boolean {
  return existsSync(getTuiMarkerPath())
}

const USAGE_TEXT = [
  '用法: /tui [子命令]',
  '',
  '  (无参数)     切换无闪烁 TUI 模式（备用屏幕缓冲区）',
  '  on           启用 TUI 模式',
  '  off          禁用 TUI 模式',
  '  status       显示当前 TUI 模式状态',
  '',
  'TUI 模式使用 ANSI 备用屏幕缓冲区 (\\x1b[?1049h)，',
  '使 Claude Code UI 占用干净的全屏区域，无滚动闪烁。',
  '设置存储在 ~/.claude/.tui-mode 中，在下次会话启动时生效。',
  '',
  'Shell 配置集成（每次启动时自动启用）：',
  '  [ -f "$HOME/.claude/.tui-mode" ] && export CLAUDE_CODE_NO_FLICKER=1',
  '',
  '环境变量覆盖：',
  '  CLAUDE_CODE_NO_FLICKER=1   强制开启（覆盖标记文件）',
  '  CLAUDE_CODE_NO_FLICKER=0   强制关闭（覆盖标记文件）',
].join('\n')

function enableTui(): LocalCommandResult {
  const markerPath = getTuiMarkerPath()
  mkdirSync(getClaudeConfigHomeDir(), { recursive: true })
  writeFileSync(markerPath, new Date().toISOString(), 'utf8')
  return {
    type: 'text',
    value: [
      '## 已启用 TUI 模式',
      '',
      `标记已写入: \`${markerPath}\``,
      '',
      '无闪烁备用屏幕渲染将在下次会话启动时激活。',
      '将以下内容添加到你的 shell 配置文件中使其永久生效：',
      '',
      '  [ -f "$HOME/.claude/.tui-mode" ] && export CLAUDE_CODE_NO_FLICKER=1',
      '',
      '要禁用: `/tui off`',
    ].join('\n'),
  }
}

function disableTui(): LocalCommandResult {
  const markerPath = getTuiMarkerPath()
  if (!existsSync(markerPath)) {
    return {
      type: 'text',
      value: 'TUI 模式未处于活跃状态。',
    }
  }
  unlinkSync(markerPath)
  return {
    type: 'text',
    value: [
      '## 已禁用 TUI 模式',
      '',
      `标记已移除: \`${markerPath}\``,
      '',
      '标准（非备用屏幕）渲染将在下次会话启动时使用。',
      '',
      '要重新启用: `/tui on`',
    ].join('\n'),
  }
}

export async function callTui(args: string): Promise<LocalCommandResult> {
  const sub = args.trim().toLowerCase()

  // ── status ──────────────────────────────────────────────────────────
  if (sub === 'status') {
    const enabled = isTuiModeEnabled()
    const markerPath = getTuiMarkerPath()
    const envVal = process.env.CLAUDE_CODE_NO_FLICKER
    let envLine: string
    if (envVal === '1' || envVal === 'true') {
      envLine = 'CLAUDE_CODE_NO_FLICKER=1（通过环境变量强制开启）'
    } else if (envVal === '0' || envVal === 'false') {
      envLine = 'CLAUDE_CODE_NO_FLICKER=0（通过环境变量强制关闭）'
    } else {
      envLine = 'CLAUDE_CODE_NO_FLICKER 未设置'
    }
    return {
      type: 'text',
      value: [
        '## TUI 模式状态',
        '',
        `  标记文件:    ${enabled ? '存在' : '不存在'} (\`${markerPath}\`)`,
        `  模式:        ${enabled ? '已启用' : '已禁用'}`,
        `  环境变量:    ${envLine}`,
        '',
        '注意：更改将在下次会话启动时生效。',
      ].join('\n'),
    }
  }

  // ── on ───────────────────────────────────────────────────────────────
  if (sub === 'on') {
    return enableTui()
  }

  // ── off ──────────────────────────────────────────────────────────────
  if (sub === 'off') {
    return disableTui()
  }

  // ── toggle (legacy default) ──────────────────────────────────────────
  if (sub === '' || sub === 'toggle') {
    return isTuiModeEnabled() ? disableTui() : enableTui()
  }

  // ── unknown subcommand ───────────────────────────────────────────────
  return {
    type: 'text',
    value: [`未知子命令: "${sub}"`, '', USAGE_TEXT].join('\n'),
  }
}

const tuiCommand: Command = {
  type: 'local-jsx',
  name: 'tui',
  description:
    '管理无闪烁 TUI 模式。打开操作面板或运行: status、on、off、toggle',
  isHidden: false,
  isEnabled: () => !getIsNonInteractiveSession(),
  argumentHint: '[status|on|off|toggle]',
  bridgeSafe: true,
  getBridgeInvocationError: args =>
    args.trim()
      ? undefined
      : 'Use /tui status/on/off/toggle over Remote Control.',
  load: () => import('./panel.js'),
}

export const tuiNonInteractive: Command = {
  type: 'local',
  name: 'tui',
  description:
    'Toggle flicker-free TUI mode (alternate screen buffer). Subcommands: on, off, status',
  isHidden: false,
  isEnabled: () => getIsNonInteractiveSession(),
  supportsNonInteractive: true,
  bridgeSafe: true,
  load: async () => ({
    call: callTui,
  }),
}

export default tuiCommand
