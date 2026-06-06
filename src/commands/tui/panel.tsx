import React, { useMemo, useState } from 'react';
import { Box, Dialog, Text, useInput } from '@anthropic/ink';
import type { LocalJSXCommandOnDone } from '../../types/command.js';
import { callTui } from './index.js';

type TuiAction = {
  label: string;
  description: string;
  run: () => void;
};

const ACTION_LABEL_COLUMN_WIDTH = 24;

async function runTuiAction(subcommand: string, onDone: LocalJSXCommandOnDone): Promise<void> {
  const result = await callTui(subcommand);
  if (result.type === 'text') {
    onDone(result.value, { display: 'system' });
  }
}

function TuiPanel({ onDone }: { onDone: LocalJSXCommandOnDone }): React.ReactNode {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const actions = useMemo<TuiAction[]>(
    () => [
      {
        label: '状态',
        description: '显示标记和环境覆盖状态',
        run: () => void runTuiAction('status', onDone),
      },
      {
        label: '切换',
        description: '切换下次会话的持久化 TUI 模式',
        run: () => void runTuiAction('toggle', onDone),
      },
      {
        label: '开启',
        description: '启用无闪烁备用屏幕模式',
        run: () => void runTuiAction('on', onDone),
      },
      {
        label: '关闭',
        description: '禁用无闪烁备用屏幕模式',
        run: () => void runTuiAction('off', onDone),
      },
    ],
    [onDone],
  );

  const selectCurrent = () => {
    const action = actions[selectedIndex];
    if (!action) return;
    action.run();
  };

  useInput((_input, key) => {
    if (key.upArrow) {
      setSelectedIndex(index => Math.max(0, index - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(index => Math.min(actions.length - 1, index + 1));
      return;
    }
    if (key.return) {
      selectCurrent();
    }
  });

  return (
    <Dialog
      title="TUI 模式"
      subtitle={`${actions.length} 个操作`}
      onCancel={() => onDone('TUI 模式面板已关闭', { display: 'system' })}
      color="background"
      hideInputGuide
    >
      <Box flexDirection="column">
        {actions.map((action, index) => (
          <Box key={action.label} flexDirection="row">
            <Text>{`${index === selectedIndex ? '›' : ' '} ${action.label}`.padEnd(ACTION_LABEL_COLUMN_WIDTH)}</Text>
            <Text dimColor>{action.description}</Text>
          </Box>
        ))}
        <Box marginTop={1}>
          <Text dimColor>↑/↓ 选择 · Enter 运行 · Esc 关闭</Text>
        </Box>
      </Box>
    </Dialog>
  );
}

export async function call(onDone: LocalJSXCommandOnDone, _context: unknown, args?: string): Promise<React.ReactNode> {
  const trimmed = args?.trim() ?? '';
  if (trimmed) {
    await runTuiAction(trimmed, onDone);
    return null;
  }
  return <TuiPanel onDone={onDone} />;
}
