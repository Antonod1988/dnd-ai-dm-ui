const path = require('node:path');
const fs = require('node:fs');
const { buildSync } = require('esbuild');
const root = path.resolve(__dirname, '..');
fs.mkdirSync(path.join(root, 'vendor', 'dnd-core', 'dist'), { recursive: true });
buildSync({ entryPoints: [path.join(root, 'vendor/dnd-core/entry.ts')], outfile: path.join(root, 'vendor/dnd-core/dist/engine.mjs'), bundle: true, platform: 'node', format: 'esm', target: 'node20', packages: 'external', logLevel: 'warning' });
console.log('SRD rules engine built from the pinned local source.');
