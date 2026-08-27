import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const hook = pathToFileURL(
  resolve('tools/scripts/rigging-roi-locator-repair-hook.mjs'),
).href;
const target = resolve('tools/scripts/shot03-rigging-roi-search.mjs');
const args = process.argv.slice(2);
const forwarded = args.length ? args : ['generate'];

console.log('Shot 3 bounded rigging ROI search autopilot');
console.log('Policy: strict normalized locator contract with at most one Ollama correction attempt.');
console.log('No coordinate-system guessing, no canonical mutation, no motion activation.');
console.log('');

const result = spawnSync(
  process.execPath,
  ['--import', hook, target, ...forwarded],
  {
    cwd: resolve('.'),
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
    shell: false,
  },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
