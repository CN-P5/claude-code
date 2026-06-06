import * as React from 'react';
import { Box, Pane, Text, useTheme } from '@anthropic/ink';
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '../../services/analytics/index.js';
import type { LocalJSXCommandCall } from '../../types/command.js';
import { ThemePicker } from '../../components/ThemePicker.js';
import { getGlobalConfig, saveCurrentProjectConfig, saveGlobalConfig } from '../../utils/config.js';
import type { ThemeSetting } from '../../utils/theme.js';

/**
 * /onboarding [subcommand]
 *
 * User-facing slash command that re-runs the first-run setup flow. The
 * official v2.1.123 binary advertises `/onboarding` and emits
 * `tengu_onboarding_step` telemetry; this command exposes a clean entry
 * point for re-running individual steps after initial setup.
 *
 * Subcommands:
 *   (none) | full | reset  — clear `hasCompletedOnboarding` so the next
 *                            REPL launch re-runs the full flow, then exit
 *                            with instructions.
 *   theme                  — render the theme picker inline.
 *   trust                  — clear the workspace trust acceptance and
 *                            instruct the user to restart.
 *   model                  — defer to /model (cannot mid-call suspend
 *                            into a separate command's Ink picker; print
 *                            instructions instead).
 *   mcp                    — print MCP setup hints (delegates to /mcp).
 *   status                 — show current onboarding state (theme,
 *                            completion flag, trust, last version).
 */
export type OnboardingSubcommand = 'full' | 'theme' | 'trust' | 'model' | 'mcp' | 'status';

const SUBCOMMANDS: ReadonlySet<OnboardingSubcommand> = new Set(['full', 'theme', 'trust', 'model', 'mcp', 'status']);

function meta(s: string): AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  return s as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS;
}

export function parseSubcommand(args: string): {
  sub: OnboardingSubcommand;
  unknownArg?: string;
} {
  const trimmed = args.trim().toLowerCase();
  if (trimmed === '' || trimmed === 'reset') {
    return { sub: 'full' };
  }
  if (SUBCOMMANDS.has(trimmed as OnboardingSubcommand)) {
    return { sub: trimmed as OnboardingSubcommand };
  }
  return { sub: 'full', unknownArg: trimmed };
}

function ThemeSubcommand({ onDone }: { onDone: (msg: string) => void }): React.ReactNode {
  const [, setTheme] = useTheme();
  return (
    <Pane color="permission">
      <ThemePicker
        onThemeSelect={(setting: ThemeSetting) => {
          setTheme(setting);
          logEvent('tengu_onboarding_step', { stepId: meta('theme') });
          onDone(`主题已设置为 ${setting}。`);
        }}
        onCancel={() => onDone('主题选择器已关闭。')}
        skipExitHandling={true}
      />
    </Pane>
  );
}

function StatusView({
  theme,
  hasCompletedOnboarding,
  lastOnboardingVersion,
}: {
  theme: string;
  hasCompletedOnboarding: boolean;
  lastOnboardingVersion: string;
}): React.ReactNode {
  return (
    <Box flexDirection="column" paddingLeft={1}>
      <Text bold>引导状态</Text>
      <Text>
        - 主题: <Text bold>{theme}</Text>
      </Text>
      <Text>
        - 引导已完成:{' '}
        <Text bold color={hasCompletedOnboarding ? 'success' : 'warning'}>
          {hasCompletedOnboarding ? '是' : '否'}
        </Text>
      </Text>
      <Text>
        - 最后引导版本: <Text bold>{lastOnboardingVersion}</Text>
      </Text>
      <Text dimColor>
        运行 /onboarding（无参数）重新运行完整流程，或 /onboarding theme | trust | model | mcp 执行特定步骤。
      </Text>
    </Box>
  );
}

export const callOnboarding: LocalJSXCommandCall = async (onDone, _context, args) => {
  const { sub, unknownArg } = parseSubcommand(args);
  logEvent('tengu_onboarding_step', { stepId: meta(`slash_${sub}`) });

  if (unknownArg !== undefined) {
    onDone(
      `未知的 /onboarding �命令: \`${unknownArg}\`。\n` + `有效选项: full | theme | trust | model | mcp | status`,
      { display: 'system' },
    );
    return null;
  }

  if (sub === 'theme') {
    return <ThemeSubcommand onDone={msg => onDone(msg)} />;
  }

  if (sub === 'trust') {
    saveCurrentProjectConfig(current => ({
      ...current,
      hasTrustDialogAccepted: false,
    }));
    onDone('当前项目的工作区信任已清除。' + '信任对话框将在下次 `claude` 启动时出现。', { display: 'system' });
    return null;
  }

  if (sub === 'model') {
    onDone('运行 `/model` 选择 AI 模型。' + '引导不负责模型选择器；此条目仅用于' + '可发现性。', { display: 'system' });
    return null;
  }

  if (sub === 'mcp') {
    onDone(
      'MCP 服务器设置:\n' +
        '  - `/mcp` — 列出已配置的 MCP 服务器\n' +
        '  - `claude mcp add <name> <command>` — 添加服务器（在 shell 中）\n' +
        '  - `claude mcp remove <name>` — 移除服务器\n' +
        '服务器还从工作区的 `.mcp.json` 和全局的 ' +
        '`~/.claude.json` 加载。',
      { display: 'system' },
    );
    return null;
  }

  if (sub === 'status') {
    const cfg = getGlobalConfig();
    return (
      <StatusView
        theme={cfg.theme ?? '(unset)'}
        hasCompletedOnboarding={cfg.hasCompletedOnboarding === true}
        lastOnboardingVersion={cfg.lastOnboardingVersion ?? '(unset)'}
      />
    );
  }

  // sub === 'full'
  // Clearing `hasCompletedOnboarding` causes `showSetupScreens()` (in
  // src/interactiveHelpers.tsx) to render the full Onboarding component
  // on the next launch. We cannot render <Onboarding /> mid-REPL because
  // it owns terminal-setup detection, OAuth flow, and final redirect to
  // the prompt — not safe to mount inside an active REPL session.
  saveGlobalConfig(current => ({
    ...current,
    hasCompletedOnboarding: false,
  }));
  onDone(
    '引导标志已清除。完整的首次设置 ' +
      '(主题、OAuth/API 密钥、安全说明、终端设置) ' +
      '将在下次 `claude` 启动时运行。\n\n' +
      '在本次会话中执行单个步骤，请使用:\n' +
      '  /onboarding theme   — 重新选择主题\n' +
      '  /onboarding trust   — 下次启动时重新确认工作区信任\n' +
      '  /onboarding model   — 打开 /model 选择器\n' +
      '  /onboarding mcp     — 显示 MCP 设置提示\n' +
      '  /onboarding status  — 显示当前引导状态',
    { display: 'system' },
  );
  return null;
};
