import React from 'react';
import { Box, Text } from '@anthropic/ink';
import type { Theme } from '@anthropic/ink';
import type { Credential, Vault } from './vaultsApi.js';

type Props =
  | { mode: 'list'; vaults: Vault[] }
  | { mode: 'detail'; vault: Vault }
  | { mode: 'created'; vault: Vault }
  | { mode: 'archived'; vault: Vault }
  | { mode: 'credential-list'; vaultId: string; credentials: Credential[] }
  | { mode: 'credential-added'; vaultId: string; credentialId: string }
  | { mode: 'credential-archived'; vaultId: string; credentialId: string }
  | { mode: 'error'; message: string };

function VaultRow({ vault }: { vault: Vault }): React.ReactNode {
  const isArchived = !!vault.archived_at;
  const createdAt = vault.created_at ? new Date(vault.created_at).toLocaleString() : '—';
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold>{vault.vault_id}</Text>
        <Text dimColor> · </Text>
        <Text color={(isArchived ? 'warning' : 'success') as keyof Theme}>{isArchived ? '已归档' : '活跃'}</Text>
      </Box>
      <Text>名称: {vault.name}</Text>
      <Text dimColor>创建时间: {createdAt}</Text>
    </Box>
  );
}

export function VaultView(props: Props): React.ReactNode {
  if (props.mode === 'list') {
    if (props.vaults.length === 0) {
      return (
        <Box>
          <Text dimColor>未找到保险库。使用 /vault create &lt;name&gt; 创建一个。</Text>
        </Box>
      );
    }
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>保险库 ({props.vaults.length})</Text>
        </Box>
        {props.vaults.map(vault => (
          <VaultRow key={vault.vault_id} vault={vault} />
        ))}
      </Box>
    );
  }

  if (props.mode === 'detail') {
    const { vault } = props;
    const isArchived = !!vault.archived_at;
    const createdAt = vault.created_at ? new Date(vault.created_at).toLocaleString() : '—';
    const archivedAt = vault.archived_at ? new Date(vault.archived_at).toLocaleString() : null;
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>保险库: {vault.vault_id}</Text>
        </Box>
        <Text>名称: {vault.name}</Text>
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
    const { vault } = props;
    return (
      <Box flexDirection="column">
        <Box>
          <Text bold color={'success' as keyof Theme}>
            保险库已创建
          </Text>
        </Box>
        <Text>ID: {vault.vault_id}</Text>
        <Text>名称: {vault.name}</Text>
      </Box>
    );
  }

  if (props.mode === 'archived') {
    const { vault } = props;
    const archivedAt = vault.archived_at ? new Date(vault.archived_at).toLocaleString() : '—';
    return (
      <Box flexDirection="column">
        <Box>
          <Text bold color={'warning' as keyof Theme}>
            保险库已归档
          </Text>
        </Box>
        <Text>ID: {vault.vault_id}</Text>
        <Text dimColor>归档时间: {archivedAt}</Text>
      </Box>
    );
  }

  if (props.mode === 'credential-list') {
    const { vaultId, credentials } = props;
    if (credentials.length === 0) {
      return (
        <Box>
          <Text dimColor>
            保险库 {vaultId} 中没有凭据。使用 /vault add-credential {vaultId} &lt;key&gt; &lt;value&gt; 添加一个。
          </Text>
        </Box>
      );
    }
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>
            {vaultId} 中的凭据 ({credentials.length})
          </Text>
        </Box>
        {credentials.map(cred => {
          const isArchived = !!cred.archived_at;
          return (
            <Box key={cred.credential_id} flexDirection="column" marginBottom={1}>
              <Box>
                <Text bold>{cred.credential_id}</Text>
                <Text dimColor> · </Text>
                {cred.kind ? <Text dimColor>{cred.kind}</Text> : null}
                {isArchived ? (
                  <>
                    <Text dimColor> · </Text>
                    <Text color={'warning' as keyof Theme}>已归档</Text>
                  </>
                ) : null}
              </Box>
              {/* SECURITY: credential value is never displayed */}
              <Text dimColor>值: ***mask***</Text>
            </Box>
          );
        })}
      </Box>
    );
  }

  if (props.mode === 'credential-added') {
    const { vaultId, credentialId } = props;
    return (
      <Box flexDirection="column">
        <Box>
          <Text bold color={'success' as keyof Theme}>
            凭据已添加
          </Text>
        </Box>
        <Text>ID: {credentialId}</Text>
        <Text>保险库: {vaultId}</Text>
        {/* SECURITY: credential value is never echoed back */}
        <Text dimColor>值: ***mask***</Text>
      </Box>
    );
  }

  if (props.mode === 'credential-archived') {
    const { vaultId, credentialId } = props;
    return (
      <Box flexDirection="column">
        <Box>
          <Text bold color={'warning' as keyof Theme}>
            凭据已归档
          </Text>
        </Box>
        <Text>ID: {credentialId}</Text>
        <Text>保险库: {vaultId}</Text>
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
