import * as React from 'react';
import type { LocalJSXCommandContext } from '../../commands.js';
import { getOauthProfileFromOauthToken } from '../../services/oauth/getOauthProfile.js';
import type { LocalJSXCommandOnDone } from '../../types/command.js';
import { getClaudeAIOAuthTokens, isClaudeAISubscriber } from '../../utils/auth.js';
import { openBrowser } from '../../utils/browser.js';
import { logError } from '../../utils/log.js';
import { Login } from '../login/login.js';

export async function call(
  onDone: LocalJSXCommandOnDone,
  context: LocalJSXCommandContext,
): Promise<React.ReactNode | null> {
  try {
    // Check if user is already on the highest Max plan (20x)
    if (isClaudeAISubscriber()) {
      const tokens = getClaudeAIOAuthTokens();
      let isMax20x = false;

      if (tokens?.subscriptionType && tokens?.rateLimitTier) {
        isMax20x = tokens.subscriptionType === 'max' && tokens.rateLimitTier === 'default_claude_max_20x';
      } else if (tokens?.accessToken) {
        const profile = await getOauthProfileFromOauthToken(tokens.accessToken);
        isMax20x =
          profile?.organization?.organization_type === 'claude_max' &&
          profile?.organization?.rate_limit_tier === 'default_claude_max_20x';
      }

      if (isMax20x) {
        setTimeout(onDone, 0, '您已在最高 Max 订阅计划上。如需额外用量，请运行 /login 切换到 API 按量计费账户。');
        return null;
      }
    }

    const url = 'https://claude.ai/upgrade/max';
    await openBrowser(url);

    return (
      <Login
        startingMessage={'正在执行 /upgrade 后的新登录。按 Ctrl-C 退出以使用现有账户。'}
        onDone={success => {
          context.onChangeAPIKey();
          onDone(success ? '登录成功' : '登录已中断');
        }}
      />
    );
  } catch (error) {
    logError(error as Error);
    setTimeout(onDone, 0, '打开浏览器失败。请访问 https://claude.ai/upgrade/max 进行升级。');
  }
  return null;
}
