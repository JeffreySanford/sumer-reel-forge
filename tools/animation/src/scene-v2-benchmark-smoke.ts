import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import type { SceneV2 } from './scene-v2';

const scenePath = resolve(
  'tools/animation/scenes/reel-01-shot-03-benchmark.scene-v2.json',
);
const scene = JSON.parse(await readFile(scenePath, 'utf8')) as SceneV2;
const propsPath = resolve('tmp/scene-v2-benchmark-smoke-props.json');
await writeFile(propsPath, `${JSON.stringify({ scene }, null, 2)}\n`, 'utf8');

await new Promise<void>((resolvePromise, rejectPromise) => {
  const child = spawn(
    'pnpm',
    [
      'exec',
      'remotion',
      'compositions',
      resolve('tools/animation/src/index.tsx'),
      `--props=${propsPath}`,
      `--public-dir=${resolve('assets')}`,
      '--quiet',
    ],
    {
      cwd: resolve('.'),
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'inherit'],
      windowsHide: true,
    },
  );

  let stdout = '';
  child.stdout.on('data', (chunk) => {
    stdout += String(chunk);
  });
  child.once('error', rejectPromise);
  child.once('exit', (code, signal) => {
    if (code !== 0) {
      rejectPromise(
        new Error(
          `Remotion compositions smoke check failed with ${signal ? `signal ${signal}` : `exit code ${code}`}.`,
        ),
      );
      return;
    }
    if (!stdout.split(/\s+/).includes('SceneV2Benchmark')) {
      rejectPromise(
        new Error(`SceneV2Benchmark composition was not registered. Output: ${stdout}`),
      );
      return;
    }
    console.log('SceneV2Benchmark composition registered successfully.');
    resolvePromise();
  });
});
