import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';

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
    cwd: resolve('.'),
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
openLocalFile(videoPath);

function openLocalFile(filePath) {
  let child;
  if (process.platform === 'win32') {
    const escapedPath = filePath.replace(/"/g, '""');
    child = spawn(
      'cmd.exe',
      ['/d', '/s', '/c', `start "" "${escapedPath}"`],
      {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      },
    );
  } else if (process.platform === 'darwin') {
    child = spawn('open', [filePath], {
      detached: true,
      stdio: 'ignore',
    });
  } else {
    child = spawn('xdg-open', [filePath], {
      detached: true,
      stdio: 'ignore',
    });
  }

  child.once('error', (error) => {
    console.warn(`Could not open ${filePath}: ${error.message}`);
  });
  child.unref();
}
