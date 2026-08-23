import 'dotenv/config';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

async function main(): Promise<void> {
  const root = resolve('.');
  const bundleDirectory = resolve(
    process.env.ANIMATION_SHARED_BUNDLE_DIRECTORY ??
      'tmp/remotion-bundles/reel1-animation-smoke',
  );
  await mkdir(bundleDirectory, { recursive: true });

  console.log('Preparing one shared Remotion bundle for Reel 1 smoke...');
  console.log(`Bundle: ${bundleDirectory}`);
  const startedAt = Date.now();
  await run(
    'pnpm',
    [
      'exec',
      'remotion',
      'bundle',
      resolve('tools/animation/src/index.tsx'),
      `--out-dir=${bundleDirectory}`,
      `--public-dir=${resolve('assets')}`,
    ],
    root,
    process.env,
  );
  const bundleDurationMs = Date.now() - startedAt;
  console.log(`Shared bundle ready in ${(bundleDurationMs / 1000).toFixed(1)}s.`);
  console.log('Starting smoke renders against the prepared bundle.');

  await run(
    'pnpm',
    ['animation:smoke:reel1:core'],
    root,
    {
      ...process.env,
      REMOTION_SHARED_BUNDLE: bundleDirectory,
      ANIMATION_SMOKE_BUNDLE_DURATION_MS: String(bundleDurationMs),
    },
  );
}

function run(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      env,
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
