import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const result = spawnSync(
  process.execPath,
  [
    resolve('tools/scripts/animation-candidate-review-packet.mjs'),
    '--config=tools/animation/review-sets/shot03-recovered-motion.review-set.json',
    ...process.argv.slice(2),
  ],
  { cwd: resolve('.'), stdio: 'inherit', windowsHide: true, shell: false },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
