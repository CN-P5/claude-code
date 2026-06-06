import { feature } from 'bun:bundle';
import * as React from 'react';
import { resetCostState } from '../../bootstrap/state.js';
import { clearTrustedDeviceToken, enrollTrustedDevice } from '../../bridge/trustedDevice.js';
import type { LocalJSXCommandContext } from '../../commands.js';
import { ConfigurableShortcutHint } from '../../components/ConfigurableShortcutHint.js';
import { ConsoleOAuthFlow } from '../../components/ConsoleOAuthFlow.js';
import { Box, Dialog, useInput } from '@anthropic/ink';
import { useMainLoopModel } from '../../hooks/useMainLoopModel.js';
import { Text } from '@anthropic/ink';
import { refreshGrowthBookAfterAuthChange } from '../../services/analytics/growthbook.js';
import { refreshPolicyLimits } from '../../services/policyLimits/index.js';
import { refreshRemoteManagedSettings } from '../../services/remoteManagedSettings/index.js';
import type { LocalJSXCommandOnDone } from '../../types/command.js';
import { stripSignatureBlocks } from '../../utils/messages.js';
import {
  checkAndDisableAutoModeIfNeeded,
  resetAutoModeGateCheck,
} from '../../utils/permissions/bypassPermissionsKillswitch.js';
import { resetUserCache } from '../../utils/user.js';
import { AuthPlaneSummary } from './AuthPlaneSummary.js';
import { getAuthStatus } from './getAuthStatus.js';
import { WorkspaceKeyInputContainer } from './WorkspaceKeyInput.js';
import { removeWorkspaceKey } from '../../services/auth/saveWorkspaceKey.js';

export async function call(onDone: LocalJSXCommandOnDone, context: LocalJSXCommandContext): Promise<React.ReactNode> {
  // Snapshot auth state once at call time (pure, no network)
  const authStatus = getAuthStatus();

  return (
    <Login
      authStatus={authStatus}
      onDone={async success => {
        context.onChangeAPIKey();
        // Signature-bearing blocks (thinking, connector_text) are bound to the API key —
        // strip them so the new key doesn't reject stale signatures.
        context.setMessages(stripSignatureBlocks);
        if (success) {
          // Post-login refresh logic. Keep in sync with onboarding in src/interactiveHelpers.tsx
          // Reset cost state when switching accounts
          resetCostState();
          // Refresh remotely managed settings after login (non-blocking)
          void refreshRemoteManagedSettings();
          // Refresh policy limits after login (non-blocking)
          void refreshPolicyLimits();
          // Clear user data cache BEFORE GrowthBook refresh so it picks up fresh credentials
          resetUserCache();
          // Refresh GrowthBook after login to get updated feature flags (e.g., for claude.ai MCPs)
          refreshGrowthBookAfterAuthChange();
          // Clear any stale trusted device token from a previous account before
          // re-enrolling — prevents sending the old token on bridge calls while
          // the async enrollTrustedDevice() is in-flight.
          clearTrustedDeviceToken();
          // Enroll as a trusted device for Remote Control (10-min fresh-session window)
          void enrollTrustedDevice();
          // Reset killswitch gate checks and re-run with new org
          resetAutoModeGateCheck();
          const appState = context.getAppState();
          void checkAndDisableAutoModeIfNeeded(appState.toolPermissionContext, context.setAppState, appState.fastMode);
          // Increment authVersion to trigger re-fetching of auth-dependent data in hooks (e.g., MCP servers)
          context.setAppState(prev => ({
            ...prev,
            authVersion: prev.authVersion + 1,
          }));
        }
        onDone(success ? '登录成功' : '登录已中断');
      }}
    />
  );
}

export function Login(props: {
  onDone: (success: boolean, mainLoopModel: string) => void;
  startingMessage?: string;
  /** Pre-computed auth status snapshot — passed from call() to avoid re-computing */
  authStatus?: import('./getAuthStatus.js').AuthStatus;
}): React.ReactNode {
  const mainLoopModel = useMainLoopModel();
  const [showWorkspaceKeyInput, setShowWorkspaceKeyInput] = React.useState(false);
  // 'idle' | 'confirm-remove' | 'removing' | { error: string }
  const [removeState, setRemoveState] = React.useState<
    { phase: 'idle' } | { phase: 'confirm-remove' } | { phase: 'removing' } | { phase: 'error'; message: string }
  >({ phase: 'idle' });
  // Re-snapshot auth status after a key is saved/removed so the row updates immediately
  const [liveAuthStatus, setLiveAuthStatus] = React.useState(props.authStatus);

  const workspaceKeySet = liveAuthStatus !== undefined && liveAuthStatus.workspaceKey.set;
  // Source distinguishes env-var (cannot be deleted from UI) vs settings-saved
  const workspaceKeyFromSettings = workspaceKeySet && liveAuthStatus.workspaceKey.source === 'settings';

  const refreshLiveStatus = React.useCallback(() => {
    const { getAuthStatus } = require('./getAuthStatus.js') as typeof import('./getAuthStatus.js');
    setLiveAuthStatus(getAuthStatus());
  }, []);

  // W = enter/replace key; D = delete (only when stored in settings)
  useInput(
    (input: string) => {
      if (showWorkspaceKeyInput) return;
      if (removeState.phase === 'confirm-remove') {
        if (input === 'y' || input === 'Y') {
          setRemoveState({ phase: 'removing' });
          void (async () => {
            try {
              await removeWorkspaceKey();
              refreshLiveStatus();
              setRemoveState({ phase: 'idle' });
            } catch (err) {
              setRemoveState({
                phase: 'error',
                message: err instanceof Error ? err.message : '删除工作区 API 密钥失败',
              });
            }
          })();
          return;
        }
        if (input === 'n' || input === 'N') {
          setRemoveState({ phase: 'idle' });
          return;
        }
        return;
      }
      if (input === 'w' || input === 'W') {
        setShowWorkspaceKeyInput(true);
        return;
      }
      if ((input === 'd' || input === 'D') && workspaceKeyFromSettings) {
        setRemoveState({ phase: 'confirm-remove' });
      }
    },
    { isActive: !showWorkspaceKeyInput },
  );

  const handleWorkspaceKeySaved = React.useCallback(() => {
    refreshLiveStatus();
    setShowWorkspaceKeyInput(false);
  }, [refreshLiveStatus]);

  const handleWorkspaceKeyCancel = React.useCallback(() => {
    setShowWorkspaceKeyInput(false);
  }, []);

  return (
    <Dialog
      title="登录"
      onCancel={() => props.onDone(false, mainLoopModel)}
      color="permission"
      inputGuide={exitState =>
        exitState.pending ? (
          <Text>再次按 {exitState.keyName} 退出</Text>
        ) : (
          <ConfigurableShortcutHint action="confirm:no" context="Confirmation" fallback="Esc" description="cancel" />
        )
      }
    >
      <Box flexDirection="column">
        {liveAuthStatus !== undefined && (
          <Box marginBottom={1}>
            <AuthPlaneSummary status={liveAuthStatus} />
          </Box>
        )}

        {showWorkspaceKeyInput ? (
          <WorkspaceKeyInputContainer onSaved={handleWorkspaceKeySaved} onCancel={handleWorkspaceKeyCancel} />
        ) : removeState.phase === 'confirm-remove' || removeState.phase === 'removing' ? (
          <Box flexDirection="column" marginBottom={1}>
            <Text>
              删除已保存的工作区 API 密钥？<Text dimColor>（仅影响 settings.json — 环境变量不受影响）</Text>
            </Text>
            <Text dimColor>{removeState.phase === 'removing' ? '正在删除…' : '按 Y 确认，按 N 取消'}</Text>
          </Box>
        ) : (
          <>
            <Box flexDirection="column" marginBottom={1}>
              {!workspaceKeySet ? (
                <Text dimColor>按 W 输入工作区 API 密钥（保存到 settings，无需重启）</Text>
              ) : workspaceKeyFromSettings ? (
                <Text dimColor>按 W 替换工作区 API 密钥 · 按 D 删除</Text>
              ) : (
                <Text dimColor>
                  来自 ANTHROPIC_API_KEY 环境变量的工作区 API 密钥。按 W 使用 settings 中保存的密钥覆盖。
                </Text>
              )}
              {removeState.phase === 'error' && <Text color="error">{removeState.message}</Text>}
            </Box>
            <ConsoleOAuthFlow
              onDone={() => props.onDone(true, mainLoopModel)}
              startingMessage={props.startingMessage}
            />
          </>
        )}
      </Box>
    </Dialog>
  );
}
