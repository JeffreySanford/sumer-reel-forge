import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const MODE = process.argv[2];
const LAYER_ID = 'shot03-rigging-v1';
const WORKFLOW = 'tools/renderer/workflows/semantic-overlay-sam3-api.json';

const commands = {
  preflight: [
    'node',
    [
      'tools/scripts/animation-layer-candidates.mjs',
      'preflight',
      '--shot=3',
      `--layer=${LAYER_ID}`,
      `--workflow=${WORKFLOW}`,
    ],
  ],
  generate: [
    'node',
    [
      'tools/scripts/animation-layer-candidates.mjs',
      'generate',
      '--shot=3',
      `--layer=${LAYER_ID}`,
      `--workflow=${WORKFLOW}`,
    ],
  ],
  verify: [
    'node',
    [
      'tools/scripts/verify-semantic-overlay-candidate.mjs',
      '--shot=3',
      `--layer=${LAYER_ID}`,
    ],
  ],
  preview: [
    'pnpm',
    [
      'exec',
      'tsx',
      'tools/scripts/render-shot03-level2-candidate-preview.ts',
      `--layer=${LAYER_ID}`,
    ],
  ],
};

if (!Object.hasOwn(commands, MODE)) {
  console.error(
    'Usage: node tools/scripts/shot03-level2-rigging.mjs <preflight|generate|verify|preview>',
  );
  process.exitCode = 1;
} else {
  const [command, args] = commands[MODE];
  const child = spawn(command, args, {
    cwd: resolve('.'),
    env: process.env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
    windowsHide: true,
  });

  child.once('error', (error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });

  child.once('exit', (code, signal) => {
    if (signal) {
      console.error(`Shot 3 Level 2 rigging ${MODE} stopped by signal ${signal}.`);
      process.exitCode = 1;
      return;
    }
    process.exitCode = code ?? 1;
  });
}
