/**
 * SnipBoundaryMessage — visual separator showing where conversation was snipped.
 */
import * as React from 'react';
import { Box, Text } from '@anthropic/ink';
import type { Message } from '../../types/message.js';

type Props = {
  message: Message;
};

export function SnipBoundaryMessage({ message }: Props): React.ReactNode {
  const content =
    typeof (message as Record<string, unknown>).content === 'string'
      ? ((message as Record<string, unknown>).content as string)
      : '[已截断] 此处之前的对话历史已被截断。';

  return (
    <Box marginTop={1} marginBottom={1}>
      <Text dimColor>── {content} ──</Text>
    </Box>
  );
}
