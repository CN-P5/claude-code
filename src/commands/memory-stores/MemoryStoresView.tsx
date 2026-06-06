import React from 'react';
import { Box, Text } from '@anthropic/ink';
import type { Theme } from '@anthropic/ink';
import type { Memory, MemoryStore, MemoryVersion } from './memoryStoresApi.js';

type Props =
  | { mode: 'list'; stores: MemoryStore[] }
  | { mode: 'detail'; store: MemoryStore }
  | { mode: 'created'; store: MemoryStore }
  | { mode: 'archived'; store: MemoryStore }
  | { mode: 'memory-list'; storeId: string; memories: Memory[] }
  | { mode: 'memory-detail'; memory: Memory }
  | { mode: 'memory-created'; memory: Memory }
  | { mode: 'memory-updated'; memory: Memory }
  | { mode: 'memory-deleted'; storeId: string; memoryId: string }
  | { mode: 'versions'; storeId: string; versions: MemoryVersion[] }
  | { mode: 'redacted'; version: MemoryVersion }
  | { mode: 'error'; message: string };

function StoreRow({ store }: { store: MemoryStore }): React.ReactNode {
  const isArchived = !!store.archived_at;
  const createdAt = store.created_at ? new Date(store.created_at).toLocaleString() : '—';
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold>{store.memory_store_id}</Text>
        <Text dimColor> · </Text>
        <Text color={(isArchived ? 'warning' : 'success') as keyof Theme}>{isArchived ? '已归档' : '活跃'}</Text>
        {store.namespace ? (
          <>
            <Text dimColor> · ns: </Text>
            <Text>{store.namespace}</Text>
          </>
        ) : null}
      </Box>
      <Text>名称: {store.name}</Text>
      <Text dimColor>创建时间: {createdAt}</Text>
    </Box>
  );
}

export function MemoryStoresView(props: Props): React.ReactNode {
  if (props.mode === 'list') {
    if (props.stores.length === 0) {
      return (
        <Box>
          <Text dimColor>未找到记忆存储。使用 /memory-stores create &lt;name&gt; 创建一个。</Text>
        </Box>
      );
    }
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>记忆存储 ({props.stores.length})</Text>
        </Box>
        {props.stores.map(store => (
          <StoreRow key={store.memory_store_id} store={store} />
        ))}
      </Box>
    );
  }

  if (props.mode === 'detail') {
    const { store } = props;
    const isArchived = !!store.archived_at;
    const createdAt = store.created_at ? new Date(store.created_at).toLocaleString() : '—';
    const archivedAt = store.archived_at ? new Date(store.archived_at).toLocaleString() : null;
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>记忆存储: {store.memory_store_id}</Text>
        </Box>
        <Text>名称: {store.name}</Text>
        {store.namespace ? <Text>命名空间: {store.namespace}</Text> : null}
        <Text>
          状态:{' '}
          <Text color={(isArchived ? 'warning' : 'success') as keyof Theme}>{isArchived ? '已归档' : '活跃'}</Text>
        </Text>
        <Text dimColor>创建时间: {createdAt}</Text>
        {archivedAt ? <Text dimColor>归档时间: {archivedAt}</Text> : null}
      </Box>
    );
  }

  if (props.mode === 'created') {
    const { store } = props;
    return (
      <Box flexDirection="column">
        <Box>
          <Text bold color={'success' as keyof Theme}>
            记忆存储已创建
          </Text>
        </Box>
        <Text>ID: {store.memory_store_id}</Text>
        <Text>Name: {store.name}</Text>
        {store.namespace ? <Text>Namespace: {store.namespace}</Text> : null}
      </Box>
    );
  }

  if (props.mode === 'archived') {
    const { store } = props;
    const archivedAt = store.archived_at ? new Date(store.archived_at).toLocaleString() : '—';
    return (
      <Box flexDirection="column">
        <Box>
          <Text bold color={'warning' as keyof Theme}>
            记忆存储已归档
          </Text>
        </Box>
        <Text>ID: {store.memory_store_id}</Text>
        <Text dimColor>归档时间: {archivedAt}</Text>
      </Box>
    );
  }

  if (props.mode === 'memory-list') {
    const { storeId, memories } = props;
    if (memories.length === 0) {
      return (
        <Box>
          <Text dimColor>
            存储 {storeId} 中没有记忆。使用 /memory-stores create-memory {storeId} &lt;content&gt; 添加一个。
          </Text>
        </Box>
      );
    }
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>
            {storeId} 中的记忆 ({memories.length})
          </Text>
        </Box>
        {memories.map(mem => (
          <Box key={mem.memory_id} flexDirection="column" marginBottom={1}>
            <Text bold>{mem.memory_id}</Text>
            <Text dimColor>{mem.content.length > 80 ? `${mem.content.slice(0, 80)}…` : mem.content}</Text>
          </Box>
        ))}
      </Box>
    );
  }

  if (props.mode === 'memory-detail') {
    const { memory } = props;
    const createdAt = memory.created_at ? new Date(memory.created_at).toLocaleString() : '—';
    const updatedAt = memory.updated_at ? new Date(memory.updated_at).toLocaleString() : '—';
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>记忆: {memory.memory_id}</Text>
        </Box>
        <Text>存储: {memory.memory_store_id}</Text>
        <Text>内容: {memory.content}</Text>
        <Text dimColor>创建时间: {createdAt}</Text>
        <Text dimColor>更新时间: {updatedAt}</Text>
      </Box>
    );
  }

  if (props.mode === 'memory-created') {
    const { memory } = props;
    return (
      <Box flexDirection="column">
        <Box>
          <Text bold color={'success' as keyof Theme}>
            记忆已创建
          </Text>
        </Box>
        <Text>ID: {memory.memory_id}</Text>
        <Text>存储: {memory.memory_store_id}</Text>
        <Text dimColor>内容: {memory.content}</Text>
      </Box>
    );
  }

  if (props.mode === 'memory-updated') {
    const { memory } = props;
    return (
      <Box flexDirection="column">
        <Box>
          <Text bold color={'success' as keyof Theme}>
            记忆已更新
          </Text>
        </Box>
        <Text>ID: {memory.memory_id}</Text>
        <Text dimColor>Content: {memory.content}</Text>
      </Box>
    );
  }

  if (props.mode === 'memory-deleted') {
    return (
      <Box>
        <Text color={'success' as keyof Theme}>
          记忆 {props.memoryId} 已从存储 {props.storeId} 中删除。
        </Text>
      </Box>
    );
  }

  if (props.mode === 'versions') {
    const { storeId, versions } = props;
    if (versions.length === 0) {
      return (
        <Box>
          <Text dimColor>存储 {storeId} 中未找到记忆版本。</Text>
        </Box>
      );
    }
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>
            {storeId} 中的记忆版本 ({versions.length})
          </Text>
        </Box>
        {versions.map(ver => {
          const createdAt = ver.created_at ? new Date(ver.created_at).toLocaleString() : '—';
          const isRedacted = !!ver.redacted_at;
          return (
            <Box key={ver.version_id} flexDirection="column" marginBottom={1}>
              <Box>
                <Text bold>{ver.version_id}</Text>
                {isRedacted ? (
                  <>
                    <Text dimColor> · </Text>
                    <Text color={'warning' as keyof Theme}>已脱敏</Text>
                  </>
                ) : null}
              </Box>
              <Text dimColor>创建时间: {createdAt}</Text>
            </Box>
          );
        })}
      </Box>
    );
  }

  if (props.mode === 'redacted') {
    const { version } = props;
    const redactedAt = version.redacted_at ? new Date(version.redacted_at).toLocaleString() : '—';
    return (
      <Box flexDirection="column">
        <Box>
          <Text bold color={'warning' as keyof Theme}>
            Version redacted
          </Text>
        </Box>
        <Text>ID: {version.version_id}</Text>
        <Text dimColor>Redacted at: {redactedAt}</Text>
      </Box>
    );
  }

  // error mode
  return (
    <Box>
      <Text color={'error' as keyof Theme}>{props.message}</Text>
    </Box>
  );
}
