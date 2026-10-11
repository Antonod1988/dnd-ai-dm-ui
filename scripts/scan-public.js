// Scan only files staged for publication; report locations, never matched secrets.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const files = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
const patterns = [/sk-(?:or-v1-|proj-)?[A-Za-z0-9_-]{25,}/, /gh[pousr]_[A-Za-z0-9]{20,}/, /AIza[A-Za-z0-9_-]{30,}/, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
let failed = false;
for (const file of files) {
  if (/^(?:data|outputs|node_modules)\//.test(file) || /^\.env(?!\.example$)/.test(file) || /accounts\.dat$|\.db$|\.log$/.test(file)) { console.error(`Private file staged: ${file}`); failed = true; continue; }
  const data = execFileSync('git', ['show', `:${file}`], { maxBuffer: 8 * 1024 * 1024 });
  if (!/\.png$/.test(file)) {
    const lines = data.toString('utf8').split(/\r?\n/);
    lines.forEach((line, index) => { if (patterns.some(p => p.test(line))) { console.error(`Possible credential: ${file}:${index + 1}`); failed = true; } });
  }
}
if (failed) process.exit(1);
console.log(`Public file scan passed: ${files.length} staged files; no credential patterns or runtime/private files found.`);
