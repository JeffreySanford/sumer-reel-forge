import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const command = process.argv[2] ?? 'verify-boat';
const laneRegistry = resolve('tools/animation/shot08-distant-vessel-production-lanes.json');
const minMaskRatio = '0.0005';

const commands = {
  'verify-boat': [
    resolve('tools/scripts/verify-semantic-overlay-candidate.mjs'),
    '--shot=8',
    '--layer=shot08-boat-v1',
    `--production-lanes=${laneRegistry}`,
  ],
  'background-preflight': [
    resolve('tools/scripts/repair-background-from-overlay.mjs'),
    'preflight',
    '--shot=8',
    '--background-layer=shot08-landfall-base-v1',
    '--foreground-layer=shot08-boat-v1',
    `--min-mask-ratio=${minMaskRatio}`,
  ],
  'background-generate': [
    resolve('tools/scripts/repair-background-from-overlay.mjs'),
    'generate',
    '--shot=8',
    '--background-layer=shot08-landfall-base-v1',
    '--foreground-layer=shot08-boat-v1',
    `--min-mask-ratio=${minMaskRatio}`,
  ],
  'background-verify': [
    resolve('tools/scripts/verify-background-repair-candidate.mjs'),
    '--shot=8',
    '--layer=shot08-landfall-base-v1',
    `--min-mask-ratio=${minMaskRatio}`,
  ],
};

const args = commands[command];
if (!args) {
  throw new Error(
    `Unknown command ${command}. Use verify-boat, background-preflight, background-generate, or background-verify.`,
  );
}

console.log(`Shot 8 distant-vessel lane · ${command}`);
if (command === 'verify-boat') {
  console.log('Policy: 0.050% hard non-triviality floor, 0.200% preferred floor, source RGB identity required.');
  console.log('Sparse masks remain SPARSE_REVIEW_REQUIRED and require human semantic confirmation of the complete useful boat silhouette.');
}

const result = spawnSync(process.execPath, args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
  windowsHide: true,
  shell: false,
});
if (result.error) throw result.error;
if (result.status !== 0) process.exitCode = result.status ?? 1;
