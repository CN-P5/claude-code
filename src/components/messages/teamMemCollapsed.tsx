import React from 'react';
import { Text } from '@anthropic/ink';
import type { CollapsedReadSearchGroup } from '../../types/message.js';

/**
 * Plain function (not a React component) so the React Compiler won't
 * hoist the teamMemory* property accesses for memoization. This module
 * is only loaded when feature('TEAMMEM') is true.
 */
export function checkHasTeamMemOps(message: CollapsedReadSearchGroup): boolean {
  return (
    (message.teamMemorySearchCount ?? 0) > 0 ||
    (message.teamMemoryReadCount ?? 0) > 0 ||
    (message.teamMemoryWriteCount ?? 0) > 0
  );
}

/**
 * Renders team memory count parts for the collapsed read/search UI.
 * This module is only loaded when feature('TEAMMEM') is true,
 * so DCE removes it entirely from external builds.
 */
export function TeamMemCountParts({
  message,
  isActiveGroup,
  hasPrecedingParts,
}: {
  message: CollapsedReadSearchGroup;
  isActiveGroup: boolean | undefined;
  hasPrecedingParts: boolean;
}): React.ReactNode {
  const tmReadCount = message.teamMemoryReadCount ?? 0;
  const tmSearchCount = message.teamMemorySearchCount ?? 0;
  const tmWriteCount = message.teamMemoryWriteCount ?? 0;

  if (tmReadCount === 0 && tmSearchCount === 0 && tmWriteCount === 0) {
    return null;
  }

  const nodes: React.ReactNode[] = [];
  let count = hasPrecedingParts ? 1 : 0;

  if (tmReadCount > 0) {
    const verb = isActiveGroup ? (count === 0 ? '回忆中' : '回忆中') : count === 0 ? '已回忆' : '已回忆';
    if (count > 0) {
      nodes.push(<Text key="comma-tmr">, </Text>);
    }
    nodes.push(
      <Text key="team-mem-read">
        {verb} <Text bold>{tmReadCount}</Text> 条团队记忆
      </Text>,
    );
    count++;
  }

  if (tmSearchCount > 0) {
    const verb = isActiveGroup ? (count === 0 ? '搜索中' : '搜索中') : count === 0 ? '已搜索' : '已搜索';
    if (count > 0) {
      nodes.push(<Text key="comma-tms">, </Text>);
    }
    nodes.push(<Text key="team-mem-search">{`${verb}团队记忆`}</Text>);
    count++;
  }

  if (tmWriteCount > 0) {
    const verb = isActiveGroup ? (count === 0 ? '写入中' : '写入中') : count === 0 ? '已写入' : '已写入';
    if (count > 0) {
      nodes.push(<Text key="comma-tmw">, </Text>);
    }
    nodes.push(
      <Text key="team-mem-write">
        {verb} <Text bold>{tmWriteCount}</Text> 条团队记忆
      </Text>,
    );
  }

  return <>{nodes}</>;
}
