import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const forwardedArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const child = spawn(
  'pnpm',
  [
    'exec',
    'tsx',
    resolve('tools/scripts/render-shot03-enki-body-candidate-preview.ts'),
    ...forwardedArgs,
  ],
  {
    cwd: resolve('.'),
    env: process.env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
    windowsHide: true,
  },
);

child.once('error', (error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

child.once('exit', (code, signal) => {
  if (signal) {
    console.error(`Shot 3 Enki body preview stopped by signal ${signal}.`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
