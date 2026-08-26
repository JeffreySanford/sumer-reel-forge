import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const reuseHook = pathToFileURL(
  resolve('tools/scripts/rigging-roi-reuse-latest-locator-hook.mjs'),
).href;
const searchScript = resolve('tools/scripts/shot03-rigging-roi-search.mjs');
const reassessScript = resolve('tools/scripts/reassess-latest-shot03-rigging-roi.mjs');

const paddings = process.env.SHOT03_RIGGING_EXTENDED_PADDINGS ?? '0.65,0.80,1.00';

console.log('Shot 3 bounded rigging ROI extended confirmation');
console.log('Policy: reuse the exact latest normalized locator; do not relocalize the target.');
console.log(`Expanded ROI paddings: ${paddings}`);
console.log('Purpose: determine whether left/right/bottom contacts clear with a larger bounded crop.');
console.log('No canonical mutation, inpaint, or motion activation.');
console.log('');

runNode([
  '--import',
  reuseHook,
  searchScript,
  'generate',
  `--paddings=${paddings}`,
]);

console.log('');
console.log('===== SOURCE-AWARE REASSESSMENT =====');
runNode([reassessScript]);

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: resolve('.'),
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${args.at(-1)} failed with exit ${result.status ?? 'unknown'}.`);
  }
}
