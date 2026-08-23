import 'dotenv/config';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { loadSceneV2ForRender } from '../animation/src/scene-v2-asset-loader';
import {
  formatLocalRenderProfile,
  getLocalRenderProfile,
} from '../animation/src/local-render-profile';

async function main(): Promise<void> {
  const root = resolve('.');
  const profile = getLocalRenderProfile();
  const outputDirectory = resolve(
    process.env.ANIMATION_BENCHMARK_OUTPUT_DIRECTORY ??
      'tmp/animation-benchmark/reel1-shot3',
  );
  await mkdir(outputDirectory, { recursive: true });

  const scenePath = resolve(
    'tools/animation/scenes/reel-01-shot-03-benchmark.scene-v2.json',
  );
  const loaded = await loadSceneV2ForRender(scenePath, resolve('assets'));
  const propsPath = join(outputDirectory, 'shot3-benchmark-props.json');
  await writeFile(
    propsPath,
    `${JSON.stringify({ scene: loaded.scene }, null, 2)}\n`,
    'utf8',
  );

  const runs = process.env.ANIMATION_BENCHMARK_RUNS ?? '2';
  const concurrencies =
    process.env.ANIMATION_BENCHMARK_CONCURRENCIES ?? '1,2,4,6,8,12';
  const frames = process.env.ANIMATION_BENCHMARK_FRAMES ?? '0-119';

  console.log('Reel 1 Remotion performance benchmark');
  console.log(`Hardware: ${formatLocalRenderProfile(profile)}`);
  console.log(`Runs per concurrency: ${runs}`);
  console.log(`Concurrencies: ${concurrencies}`);
  console.log(`Frames: ${frames}`);
  console.log('AI review is not part of this benchmark.');
  console.log('');

  const args = [
    'exec',
    'remotion',
    'benchmark',
    resolve('tools/animation/src/index.tsx'),
    'SceneV2Benchmark',
    `--props=${propsPath}`,
    `--public-dir=${resolve('assets')}`,
    '--codec=h264',
    '--pixel-format=yuv420p',
    `--runs=${runs}`,
    `--concurrencies=${concurrencies}`,
    `--frames=${frames}`,
    `--hardware-acceleration=${profile.hardwareAcceleration}`,
  ];
  if (profile.gl) args.push(`--gl=${profile.gl}`);

  await run('pnpm', args, root);
}

function run(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      shell: process.platform === 'win32',
      stdio: 'inherit',
      windowsHide: true,
    });
    child.once('error', rejectPromise);
    child.once('exit', (code, signal) => {
      if (code === 0) return resolvePromise();
      rejectPromise(
        new Error(
          `${command} ${args.join(' ')} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}.`,
        ),
      );
    });
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
