const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');

function dpapi(text, decrypt = false) {
  const operation = decrypt ? 'Unprotect' : 'Protect';
  const input = decrypt ? '[Convert]::FromBase64String($data)' : '[Text.Encoding]::UTF8.GetBytes($data)';
  const output = decrypt ? '[Text.Encoding]::UTF8.GetString($bytes)' : '[Convert]::ToBase64String($bytes)';
  const script = `Add-Type -AssemblyName System.Security; $data = [Console]::In.ReadToEnd(); $bytes = [Security.Cryptography.ProtectedData]::${operation}(${input}, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write(${output})`;
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let result = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('Credential storage timeout')); }, 15000);
    child.stdout.on('data', chunk => { result += chunk.toString(); });
    child.stderr.resume();
    child.on('error', () => { clearTimeout(timer); reject(new Error('Credential storage unavailable')); });
    child.on('close', code => { clearTimeout(timer); code === 0 ? resolve(result.trim()) : reject(new Error('Credential protection failed')); });
    child.stdin.on('error', () => {});
    child.stdin.end(text);
  });
}

function createAuthStore(directory = process.env.CHATGPT_AUTH_DIR || (process.platform === 'win32'
  ? path.join(process.env.LOCALAPPDATA || os.homedir(), 'DndAiDmUi')
  : path.join(os.homedir(), '.config', 'dnd-ai-dm-ui'))) {
  const file = path.join(directory, 'accounts.dat');
  return {
    async load() {
      try {
        const raw = await fs.readFile(file, 'utf8');
        return JSON.parse(process.platform === 'win32' ? await dpapi(raw, true) : raw);
      } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw new Error('Не удалось прочитать защищённое хранилище ChatGPT.');
      }
    },
    async save(value) {
      await fs.mkdir(directory, { recursive: true, mode: 0o700 });
      const data = JSON.stringify(value);
      const protectedData = process.platform === 'win32' ? await dpapi(data) : data;
      const tmp = `${file}.${process.pid}.tmp`;
      await fs.writeFile(tmp, protectedData, { mode: 0o600 });
      await fs.rename(tmp, file);
      if (process.platform !== 'win32') await fs.chmod(file, 0o600);
    }
  };
}
module.exports = { createAuthStore };
