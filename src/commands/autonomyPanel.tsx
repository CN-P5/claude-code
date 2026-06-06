import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from '@anthropic/ink';
import { Dialog } from '@anthropic/ink';
import { useRegisterOverlay } from '../context/overlayContext.js';
import type { LocalJSXCommandOnDone } from '../types/command.js';
import { getAutonomyCommandText, getAutonomyDeepSectionText, getAutonomyStatusText } from '../cli/handlers/autonomy.js';
import { listAutonomyFlows, type AutonomyFlowRecord } from '../utils/autonomyFlows.js';

type AutonomyAction = {
  label: string;
  description: string;
  run: () => Promise<string>;
};

const BASE_AUTONOMY_PANEL_ACTION_COUNT = 14;
const ACTION_LABEL_COLUMN_WIDTH = 24;

export function getAutonomyPanelBaseActionCountForTests(): number {
  return BASE_AUTONOMY_PANEL_ACTION_COUNT;
}

function AutonomyPanel({ onDone }: { onDone: LocalJSXCommandOnDone }): React.ReactNode {
  useRegisterOverlay('autonomy-panel');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [flows, setFlows] = useState<AutonomyFlowRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    void listAutonomyFlows().then(items => {
      if (!cancelled) setFlows(items.slice(0, 5));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const actions = useMemo<AutonomyAction[]>(() => {
    const base: AutonomyAction[] = [
      {
        label: '概览',
        description: '显示运行和流程计数以及最新的自动活动',
        run: () => getAutonomyStatusText(),
      },
      {
        label: '完整深度状态',
        description: '在一份诊断报告中打印所有本地自主性信息',
        run: () => getAutonomyStatusText({ deep: true }),
      },
      {
        label: '自动模式',
        description: '检查自动权限模式是否可用及原因',
        run: () => getAutonomyDeepSectionText('auto-mode'),
      },
      {
        label: '运行汇总',
        description: '显示排队/运行/完成/失败的运行总数及最新运行',
        run: () => getAutonomyDeepSectionText('runs'),
      },
      {
        label: '最近运行',
        description: '列出最近的自主运行 ID、触发器、状态和提示',
        run: () => getAutonomyCommandText('runs 10'),
      },
      {
        label: '流程汇总',
        description: '显示跨排队/运行/等待状态的托管流程总数',
        run: () => getAutonomyDeepSectionText('flows'),
      },
      {
        label: '最近流程',
        description: '列出最近的托管流程 ID、状态、当前步骤和目标',
        run: () => getAutonomyCommandText('flows 10'),
      },
      {
        label: '定时任务',
        description: '显示计划的自主任务、持久性、重复性和下次运行时间',
        run: () => getAutonomyDeepSectionText('cron'),
      },
      {
        label: '工作流运行',
        description: '显示持久化的 WorkflowTool 运行及其当前工作流步骤',
        run: () => getAutonomyDeepSectionText('workflow-runs'),
      },
      {
        label: '团队',
        description: '显示 Agent Teams、队友后端、活动和待办任务',
        run: () => getAutonomyDeepSectionText('teams'),
      },
      {
        label: '管道',
        description: '显示 UDS/命名管道和 LAN 注册表用于终端消息传递',
        run: () => getAutonomyDeepSectionText('pipes'),
      },
      {
        label: '运行时',
        description: '显示守护进程状态和活跃的后台或交互式会话',
        run: () => getAutonomyDeepSectionText('runtime'),
      },
      {
        label: '远程控制',
        description: '显示桥接模式、基础 URL、token 状态和授权说明',
        run: () => getAutonomyDeepSectionText('remote-control'),
      },
      {
        label: '远程触发器',
        description: '显示最近的远程触发器审计记录、失败和最新调用',
        run: () => getAutonomyDeepSectionText('remote-trigger'),
      },
    ];

    const flowActions = flows.flatMap<AutonomyAction>(flow => {
      const shortId = flow.flowId.slice(0, 8);
      const items: AutonomyAction[] = [
        {
          label: `流程 ${shortId}`,
          description: `${flow.status}: ${flow.goal}`,
          run: () => getAutonomyCommandText(`flow ${flow.flowId}`),
        },
      ];
      if (flow.status === 'waiting') {
        items.push({
          label: `恢复 ${shortId}`,
          description: flow.currentStep ? `恢复等待步骤: ${flow.currentStep}` : '恢复等待中的流程',
          run: () =>
            getAutonomyCommandText(`flow resume ${flow.flowId}`, {
              enqueueInMemory: true,
            }),
        });
      }
      if (
        flow.status === 'queued' ||
        flow.status === 'running' ||
        flow.status === 'waiting' ||
        flow.status === 'blocked'
      ) {
        items.push({
          label: `取消 ${shortId}`,
          description: `取消 ${flow.status} 流程`,
          run: () =>
            getAutonomyCommandText(`flow cancel ${flow.flowId}`, {
              removeQueuedInMemory: true,
            }),
        });
      }
      return items;
    });

    return [...base, ...flowActions];
  }, [flows]);

  const selectCurrent = () => {
    const action = actions[selectedIndex];
    if (!action) return;
    void action.run().then(result => {
      onDone(result, { display: 'system' });
    });
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
      title="自主性"
      subtitle={`${actions.length} 个操作`}
      onCancel={() => onDone('自主性面板已关闭', { display: 'system' })}
      color="background"
      hideInputGuide
    >
      <Box flexDirection="column">
        {actions.map((action, index) => (
          <Box key={`${action.label}-${index}`} flexDirection="row">
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
    const result = await getAutonomyCommandText(trimmed, {
      enqueueInMemory: true,
      removeQueuedInMemory: true,
    });
    onDone(result, { display: 'system' });
    return null;
  }

  return <AutonomyPanel onDone={onDone} />;
}
