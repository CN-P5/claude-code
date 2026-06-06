import * as React from 'react';
import { Box, Text } from '@anthropic/ink';
import {
  isShutdownApproved,
  isShutdownRejected,
  isShutdownRequest,
  type ShutdownRejectedMessage,
  type ShutdownRequestMessage,
} from '../../utils/teammateMailbox.js';

type ShutdownRequestProps = {
  request: ShutdownRequestMessage;
};

/**
 * Renders a shutdown request with a warning-colored border.
 */
export function ShutdownRequestDisplay({ request }: ShutdownRequestProps): React.ReactNode {
  return (
    <Box flexDirection="column" marginY={1}>
      <Box borderStyle="round" borderColor="warning" flexDirection="column" paddingX={1} paddingY={1}>
        <Box marginBottom={1}>
          <Text color="warning" bold>
            来自 {request.from} 的关机请求
          </Text>
        </Box>
        {request.reason && (
          <Box>
            <Text>原因：{request.reason}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

type ShutdownRejectedProps = {
  response: ShutdownRejectedMessage;
};

/**
 * Renders a shutdown rejected message with a subtle (grey) border.
 */
export function ShutdownRejectedDisplay({ response }: ShutdownRejectedProps): React.ReactNode {
  return (
    <Box flexDirection="column" marginY={1}>
      <Box borderStyle="round" borderColor="subtle" flexDirection="column" paddingX={1} paddingY={1}>
        <Text color="subtle" bold>
          {response.from} 已拒绝关机
        </Text>
        <Box
          marginTop={1}
          borderStyle="dashed"
          borderColor="subtle"
          borderLeft={false}
          borderRight={false}
          paddingX={1}
        >
          <Text>原因：{response.reason}</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>队友将继续工作。您可以稍后再次请求关机。</Text>
        </Box>
      </Box>
    </Box>
  );
}

/**
 * Try to parse and render a shutdown message from raw content.
 * Returns the rendered component if it's a shutdown message, null otherwise.
 */
export function tryRenderShutdownMessage(content: string): React.ReactNode | null {
  const request = isShutdownRequest(content);
  if (request) {
    return <ShutdownRequestDisplay request={request} />;
  }

  // Shutdown approved is handled inline by the caller — skip it here
  if (isShutdownApproved(content)) {
    return null;
  }

  const rejected = isShutdownRejected(content);
  if (rejected) {
    return <ShutdownRejectedDisplay response={rejected} />;
  }

  return null;
}

/**
 * Get a brief summary text for a shutdown message.
 * Used in places like the inbox queue where we want a short description.
 * Returns null if the content is not a shutdown message.
 */
export function getShutdownMessageSummary(content: string): string | null {
  const request = isShutdownRequest(content);
  if (request) {
    return `[来自 ${request.from} 的关机请求]${request.reason ? ` ${request.reason}` : ''}`;
  }

  const approved = isShutdownApproved(content);
  if (approved) {
    return `[关机已批准] ${approved.from} 正在退出`;
  }

  const rejected = isShutdownRejected(content);
  if (rejected) {
    return `[关机被拒绝] ${rejected.from}: ${rejected.reason}`;
  }

  return null;
}
