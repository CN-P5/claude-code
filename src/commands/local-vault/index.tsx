import type { Command } from '../../types/command.js';

const localVaultCommand: Command = {
  type: 'local-jsx',
  name: 'local-vault',
  aliases: ['lv', 'local-secret'],
  description: '管理本地加密密钥。存储在操作系统密钥链或加密文件中 — 无需 API 密钥。',
  // Avoid `<key>` / `<value>` in the hint — REPL markdown renderer eats angle-
  // bracketed words as HTML tags. Uppercase placeholders survive intact.
  argumentHint: 'list | set KEY VALUE | get KEY [--reveal] | delete KEY',
  isHidden: false,
  isEnabled: () => true,
  bridgeSafe: true,
  load: async () => {
    const m = await import('./launchLocalVault.js');
    return { call: m.callLocalVault };
  },
};

export default localVaultCommand;
