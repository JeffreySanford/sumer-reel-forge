import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';

const root = resolve('.');
const scene = resolve(
  'tools/animation/scenes/reel-01-shot-01-black-water-level2.scene-v2.json',
);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDirectory = resolve(
  'tmp/animation-previews/shot01-level2-candidate',
  stamp,
);
const videoPath = join(outputDirectory, 'shot1-scene-v2-benchmark.mp4');

const args = [
  'exec',
  'tsx',
  'tools/scripts/render-scene-v2-benchmark.ts',
  scene,
];

console.log('Rendering Shot 1 Level 2 candidate.');
console.log('Canonical animation-v1 remains unchanged; human normal-speed review is required.');
console.log(`Scene: ${scene}`);
console.log(`Output directory: ${outputDirectory}`);

await new Promise((resolvePromise, rejectPromise) => {
  const child = spawn('pnpm', args, {
    cwd: root,
    env: {
      ...process.env,
      SCENE_V2_BENCHMARK_OUTPUT_DIRECTORY: outputDirectory,
    },
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

console.log(`Opening candidate video: ${videoPath}`);
await openLocalFile(videoPath);

async function openLocalFile(filePath) {
  if (process.platform === 'win32') {
    const escapedPath = filePath.replace(/"/g, '""');
    const attempts = [
      {
        label: 'Windows Explorer shell association',
        command: 'explorer.exe',
        args: [filePath],
      },
      {
        label: 'PowerShell Start-Process',
        command: 'powershell.exe',
        args: [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          'Start-Process -LiteralPath $args[0]',
          filePath,
        ],
      },
      {
        label: 'cmd start',
        command: 'cmd.exe',
        args: ['/d', '/s', '/c', `start "" "${escapedPath}"`],
      },
    ];

    const errors = [];
    for (const attempt of attempts) {
      try {
        await launchOpener(attempt.command, attempt.args);
        console.log(`[open] ${attempt.label}: ${filePath}`);
        return;
      } catch (error) {
        errors.push(`${attempt.label}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.warn(`Could not auto-open ${filePath}.`);
    for (const error of errors) console.warn(`  ${error}`);
    console.warn(`Open manually with: explorer.exe "${filePath}"`);
    return;
  }

  const command = process.platform === 'darwin' ? 'open' : 'xdg-open';
  try {
    await launchOpener(command, [filePath]);
    console.log(`[open] ${command}: ${filePath}`);
  } catch (error) {
    console.warn(
      `Could not auto-open ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function launchOpener(command, args) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: 'ignore',
      windowsHide: false,
    });
    child.once('error', rejectPromise);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(
        new Error(
          `${command} failed with ${signal ? `signal ${signal}` : `exit code ${code ?? 'unknown'}`}`,
        ),
      );
    });
  });
}
