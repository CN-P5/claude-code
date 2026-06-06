import React from 'react';
import { Box, Dialog, Text, useInput } from '@anthropic/ink';
import type { LocalJSXCommandCall } from '../../types/command.js';
import { setSecret, getSecret, deleteSecret, listKeys, maskSecret } from '../../services/localVault/store.js';
import { isValidKey } from '../../utils/localValidate.js';
import TextInput from '../../components/TextInput.js';
import { LocalVaultView } from './LocalVaultView.js';
import { parseLocalVaultArgs } from './parseArgs.js';
import { launchCommand } from '../_shared/launchCommand.js';
import type { LocalJSXCommandOnDone } from '../../types/command.js';

const USAGE = '用法: /local-vault list | set KEY VALUE | get KEY [--reveal] | delete KEY';

type LocalVaultViewProps = React.ComponentProps<typeof LocalVaultView>;

type LocalVaultAction = {
  label: string;
  description: string;
  run: () => void;
};

const ACTION_LABEL_COLUMN_WIDTH = 26;

function formatKeyList(keys: string[]): string {
  if (keys.length === 0) {
    return '未存储任何密钥。';
  }
  return ['本地保险库密钥', ...keys.map(key => `- ${key}`)].join('\n');
}

// ── Interactive multi-step panel ───────────────────────────────────────────
// Vault state machine:
//   menu               — pick action
//   collect-key        — KEY name (Set/Get/Delete)
//   collect-value      — secret VALUE (Set only; masked input)
//   confirm-overwrite  — Y/N when key exists (Set)
//   confirm-delete     — Y/N (Delete)

type VaultActionKind = 'list' | 'set' | 'get' | 'delete' | 'about';

type VaultStep =
  | { kind: 'menu' }
  | { kind: 'collect-key'; action: VaultActionKind }
  | { kind: 'collect-value'; key: string }
  | { kind: 'confirm-overwrite'; key: string; value: string }
  | { kind: 'confirm-delete'; key: string };

const VAULT_MENU: Array<{
  kind: VaultActionKind;
  label: string;
  description: string;
}> = [
  { kind: 'list', label: 'List', description: '显示已存储的密钥' },
  {
    kind: 'set',
    label: 'Set',
    description: '存储密钥：KEY + VALUE（输入已掩码）',
  },
  {
    kind: 'get',
    label: 'Get',
    description: '查询密钥（返回掩码预览）',
  },
  {
    kind: 'delete',
    label: 'Delete',
    description: '按 KEY 删除已存储的密钥',
  },
  {
    kind: 'about',
    label: 'About',
    description: '显示命令语法',
  },
];

function LocalVaultPanel({ onDone }: { onDone: LocalJSXCommandOnDone }): React.ReactNode {
  const [step, setStep] = React.useState<VaultStep>({ kind: 'menu' });
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [textValue, setTextValue] = React.useState('');
  const [cursorOffset, setCursorOffset] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [inFlight, setInFlight] = React.useState(false);

  const transition = React.useCallback((next: VaultStep) => {
    setStep(next);
    setTextValue('');
    setCursorOffset(0);
    setError(null);
  }, []);

  const closeWith = React.useCallback((msg: string) => onDone(msg, { display: 'system' }), [onDone]);

  // ── Menu navigation ────────────────────────────────────────────────────
  useInput(
    (input, key) => {
      if (step.kind !== 'menu' || inFlight) return;
      if (key.upArrow) {
        setSelectedIndex(idx => Math.max(0, idx - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedIndex(idx => Math.min(VAULT_MENU.length - 1, idx + 1));
        return;
      }
      if (key.return) {
        const choice = VAULT_MENU[selectedIndex];
        if (!choice) return;
        if (choice.kind === 'about') {
          closeWith(USAGE);
          return;
        }
        if (choice.kind === 'list') {
          setInFlight(true);
          void listKeys().then(keys => {
            closeWith(formatKeyList(keys));
          });
          return;
        }
        // Set / Get / Delete — collect key first
        transition({ kind: 'collect-key', action: choice.kind });
        return;
      }
      const n = Number(input);
      if (Number.isInteger(n) && n >= 1 && n <= VAULT_MENU.length) {
        setSelectedIndex(n - 1);
      }
    },
    { isActive: step.kind === 'menu' && !inFlight },
  );

  // ── Confirmations (overwrite / delete) ─────────────────────────────────
  useInput(
    (input, key) => {
      if (step.kind !== 'confirm-overwrite' && step.kind !== 'confirm-delete') {
        return;
      }
      if (key.escape) {
        transition({ kind: 'menu' });
        return;
      }
      const ch = input.toLowerCase();
      if (ch === 'y' || key.return) {
        if (step.kind === 'confirm-delete') {
          setInFlight(true);
          const key = step.key;
          void deleteSecret(key).then(removed => {
            closeWith(removed ? `Deleted: ${key}` : `Key not found: ${key}`);
          });
        } else {
          // confirm-overwrite — proceed with setSecret
          setInFlight(true);
          const k = step.key;
          const v = step.value;
          void setSecret(k, v)
            .then(() => closeWith(`Secret stored: ${k} = [REDACTED]`))
            .catch(e => closeWith(`Failed to store ${k}: ${e instanceof Error ? e.message : String(e)}`));
        }
      } else if (ch === 'n') {
        transition({ kind: 'menu' });
      }
    },
    {
      isActive: (step.kind === 'confirm-overwrite' || step.kind === 'confirm-delete') && !inFlight,
    },
  );

  // Esc back-step in collect-* steps
  useInput(
    (_input, key) => {
      if (step.kind !== 'collect-key' && step.kind !== 'collect-value') return;
      if (key.escape) {
        if (step.kind === 'collect-value') {
          transition({ kind: 'collect-key', action: 'set' });
          return;
        }
        transition({ kind: 'menu' });
      }
    },
    {
      isActive: (step.kind === 'collect-key' || step.kind === 'collect-value') && !inFlight,
    },
  );

  // ── Action handlers ─────────────────────────────────────────────────────
  const handleKeySubmit = (raw: string) => {
    const key = raw.trim();
    if (!key) {
      setError('键名不能为空');
      return;
    }
    if (!isValidKey(key)) {
      setError('键名无效（仅允许字母/数字/._-；不能以 . 开头；不能是 Windows 保留名）');
      return;
    }
    if (step.kind !== 'collect-key') return;
    if (step.action === 'get') {
      setInFlight(true);
      void getSecret(key).then(v => {
        if (v === null) {
          closeWith(`Key not found: ${key}`);
        } else {
          closeWith(`Key found: ${key} = ${maskSecret(v)}`);
        }
      });
      return;
    }
    if (step.action === 'delete') {
      transition({ kind: 'confirm-delete', key });
      return;
    }
    if (step.action === 'set') {
      transition({ kind: 'collect-value', key });
      return;
    }
  };

  const handleValueSubmit = (rawValue: string) => {
    if (step.kind !== 'collect-value') return;
    if (rawValue.length === 0) {
      setError('密钥值不能为空');
      return;
    }
    const k = step.key;
    // Check overwrite
    setInFlight(true);
    void getSecret(k)
      .then(existing => {
        if (existing !== null) {
          // Need confirmation
          setInFlight(false);
          transition({
            kind: 'confirm-overwrite',
            key: k,
            value: rawValue,
          });
          return;
        }
        return setSecret(k, rawValue).then(() => closeWith(`Secret stored: ${k} = [REDACTED]`));
      })
      .catch(e => closeWith(`Failed to store ${k}: ${e instanceof Error ? e.message : String(e)}`));
  };

  // ── Render ──────────────────────────────────────────────────────────────
  if (step.kind === 'menu') {
    return (
      <Dialog
        title="本地保险库"
        subtitle={`${VAULT_MENU.length} 个操作`}
        onCancel={() => closeWith('本地保险库面板已关闭')}
        color="background"
        hideInputGuide
      >
        <Box flexDirection="column">
          {VAULT_MENU.map((m, i) => (
            <Box key={m.kind} flexDirection="row">
              <Text>{`${i === selectedIndex ? '›' : ' '} ${m.label}`.padEnd(ACTION_LABEL_COLUMN_WIDTH)}</Text>
              <Text dimColor>{m.description}</Text>
            </Box>
          ))}
          {inFlight && (
            <Box marginTop={1}>
              <Text dimColor>正在处理...</Text>
            </Box>
          )}
          <Box marginTop={1}>
            <Text dimColor>↑/↓ 或 1-5 选择 · Enter 运行 · Esc 关闭</Text>
          </Box>
        </Box>
      </Dialog>
    );
  }

  if (step.kind === 'confirm-delete') {
    return (
      <Dialog title="确认删除" onCancel={() => transition({ kind: 'menu' })} color="warning" hideInputGuide>
        <Box flexDirection="column">
          <Text>删除密钥 "{step.key}"？此操作不可撤销。</Text>
          <Box marginTop={1}>
            <Text dimColor>y/Enter = 删除 · n/Esc = 取消</Text>
          </Box>
          {inFlight && <Text dimColor>正在删除...</Text>}
        </Box>
      </Dialog>
    );
  }

  if (step.kind === 'confirm-overwrite') {
    return (
      <Dialog title="确认覆盖" onCancel={() => transition({ kind: 'menu' })} color="warning" hideInputGuide>
        <Box flexDirection="column">
          <Text>密钥 "{step.key}" 已存在。是否覆盖？原值将丢失。</Text>
          <Box marginTop={1}>
            <Text dimColor>y/Enter = 覆盖 · n/Esc = 取消</Text>
          </Box>
          {inFlight && <Text dimColor>正在存储...</Text>}
        </Box>
      </Dialog>
    );
  }

  // collect-key / collect-value
  const fieldLabel = step.kind === 'collect-key' ? '键名' : '密钥值';
  const placeholder = step.kind === 'collect-key' ? '例如: github-token' : '（已掩码输入 — 不会显示明文）';
  const onSubmit = step.kind === 'collect-key' ? handleKeySubmit : handleValueSubmit;
  const isMasked = step.kind === 'collect-value';
  return (
    <Dialog
      title={`本地保险库 · ${step.kind === 'collect-key' ? '键名' : '值'}`}
      onCancel={() => transition({ kind: 'menu' })}
      color="background"
      hideInputGuide
    >
      <Box flexDirection="column">
        <Box>
          <Text dimColor>{fieldLabel}</Text>
        </Box>
        <Box>
          <Text>{'> '}</Text>
          <TextInput
            value={textValue}
            onChange={v => {
              setTextValue(v);
              setError(null);
            }}
            cursorOffset={cursorOffset}
            onChangeCursorOffset={setCursorOffset}
            onSubmit={onSubmit}
            placeholder={placeholder}
            columns={70}
            showCursor
            mask={isMasked ? '*' : undefined}
          />
        </Box>
        {error !== null && (
          <Box marginTop={0}>
            <Text color="warning">✗ {error}</Text>
          </Box>
        )}
        {inFlight && (
          <Box marginTop={0}>
            <Text dimColor>正在处理...</Text>
          </Box>
        )}
        <Box marginTop={1}>
          <Text dimColor>Enter = 下一步 · Esc = 返回</Text>
        </Box>
      </Box>
    </Dialog>
  );
}

async function dispatchLocalVault(
  parsed: ReturnType<typeof parseLocalVaultArgs>,
  onDone: LocalJSXCommandOnDone,
): Promise<LocalVaultViewProps | null> {
  if (parsed.action === 'list') {
    const keys = await listKeys();
    onDone(formatKeyList(keys), { display: 'system' });
    return null;
  }

  if (parsed.action === 'set') {
    const { key, value } = parsed;
    await setSecret(key, value);
    // Never echo the value in onDone — security invariant
    onDone(`Secret stored: ${key} = [REDACTED]`, { display: 'system' });
    return null;
  }

  if (parsed.action === 'get') {
    const { key, reveal } = parsed;
    const value = await getSecret(key);
    if (value === null) {
      onDone(`Key not found: ${key}`, { display: 'system' });
      return null;
    }
    if (reveal) {
      // Security invariant: only --reveal shows plaintext; warn user
      onDone([`Secret revealed for: ${key}`, 'Warning: secret revealed in terminal.', `${key} = ${value}`].join('\n'), {
        display: 'system',
      });
      return null;
    }
    // Default: mask display
    const masked = maskSecret(value);
    onDone(`Key found: ${key} = ${masked}`, { display: 'system' });
    return null;
  }

  if (parsed.action === 'delete') {
    const { key } = parsed;
    const deleted = await deleteSecret(key);
    if (!deleted) {
      onDone(`Key not found: ${key}`, { display: 'system' });
      return null;
    }
    onDone(`Deleted: ${key}`, { display: 'system' });
    return null;
  }

  // Exhaustive guard — should not be reached for valid parsed actions
  onDone(USAGE, { display: 'system' });
  return null;
}

const callLocalVaultDirect: LocalJSXCommandCall = launchCommand<
  ReturnType<typeof parseLocalVaultArgs>,
  LocalVaultViewProps
>({
  commandName: 'local-vault',
  parseArgs: (raw: string) => {
    const result = parseLocalVaultArgs(raw);
    if (result.action === 'invalid') {
      return { action: 'invalid' as const, reason: `${USAGE}\n${result.reason}` };
    }
    return result;
  },
  dispatch: dispatchLocalVault,
  View: LocalVaultView,
  errorView: (msg: string) => React.createElement(LocalVaultView, { mode: 'error', message: msg }),
});

export const callLocalVault: LocalJSXCommandCall = async (onDone, context, args) => {
  if ((args ?? '').trim() === '') {
    return <LocalVaultPanel onDone={onDone} />;
  }
  return callLocalVaultDirect(onDone, context, args);
};
