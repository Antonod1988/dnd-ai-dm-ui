const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const directory = path.resolve(__dirname, '..', 'tests');
const files = fs.readdirSync(directory).filter(file => file.endsWith('.test.js')).map(file => path.join(directory, file));
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
