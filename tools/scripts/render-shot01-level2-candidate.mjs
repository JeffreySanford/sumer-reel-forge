import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const scene = resolve(
  'tools/animation/scenes/reel-01-shot-01-black-water-level2.scene-v2.json',
);

const args = [
  'exec',
  'tsx',
  'tools/scripts/render-scene-v2-benchmark.ts',
  scene,
];

console.log('Rendering Shot 1 Level 2 candidate.');
console.log('Canonical animation-v1 remains unchanged; human normal-speed review is required.');
console.log(`Scene: ${scene}`);

await new Promise((resolvePromise, rejectPromise) => {
  const child = spawn('pnpm', args, {
    cwd: resolve('.'),
    env: process.env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
    windowsHide: true,
  });

  child.once('error', rejectPromise);
  child.once('exit', (code, signal) => {
    if (code === 0) {
      resolvePromise();
      return;
    }
    rejectPromise(
      new Error(
        `Shot 1 Level 2 render failed with ${signal ? `signal ${signal}` : `exit code ${code ?? 'unknown'}`}.`,
      ),
    );
  });
});
