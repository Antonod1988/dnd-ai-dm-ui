const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const files = ['server.js', 'app.js', 'auth-ui.js', 'dialogue-ui.js', ...['src', 'scripts', 'tests'].flatMap(dir => fs.readdirSync(path.join(root, dir)).filter(file => file.endsWith('.js')).map(file => `${dir}/${file}`))];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Syntax checks passed: ${files.length} JavaScript files.`);
