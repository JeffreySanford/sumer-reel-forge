import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { sha256, writeJson } from '../renderer/artifact-utils.mjs';
import { loadRendererConfig } from '../renderer/renderer-config.mjs';

const root = resolve('.');
const baselineScene = resolve(
  'tools/animation/scenes/reel-01-shot-01-black-water-benchmark.scene-v2.json',
);
const candidateScene = resolve(
  'tools/animation/scenes/reel-01-shot-01-black-water-level2.scene-v2.json',
);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const proofRoot = resolve('tmp/animation-previews/shot01-level2-proof', stamp);
const baselineDirectory = join(proofRoot, 'baseline');
const candidateDirectory = join(proofRoot, 'candidate');
const baselineVideo = join(baselineDirectory, 'shot1-scene-v2-benchmark.mp4');
const candidateVideo = join(candidateDirectory, 'shot1-scene-v2-benchmark.mp4');
const abVideo = join(proofRoot, 'shot01-baseline-vs-level2-ab.mp4');
const proofPath = join(proofRoot, 'shot01-level2-rendered-proof.json');

await mkdir(baselineDirectory, { recursive: true });
await mkdir(candidateDirectory, { recursive: true });

console.log('Shot 1 Level 2 normal-speed A/B review');
console.log('LEFT = current canonical camera-only benchmark');
console.log('RIGHT = Level 2 environmental motion candidate');
console.log('No animation-v1 assets or manifest state will be modified.');
console.log(`Proof directory: ${proofRoot}`);
console.log('');

await renderScene(baselineScene, baselineDirectory, 'baseline');
await renderScene(candidateScene, candidateDirectory, 'candidate');

const config = loadRendererConfig();
await run(
  config.ffmpegCommand,
  [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    baselineVideo,
    '-i',
    candidateVideo,
    '-filter_complex',
    '[0:v]setpts=PTS-STARTPTS[left];[1:v]setpts=PTS-STARTPTS[right];[left][right]hstack=inputs=2[v]',
    '-map',
    '[v]',
    '-an',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-shortest',
    abVideo,
  ],
  root,
);

await writeJson(proofPath, {
  schemaVersion: 1,
  proofType: 'shot01-level2-baseline-vs-candidate',
  generatedAt: new Date().toISOString(),
  sourceShotNumber: 1,
  humanReviewRequired: true,
  normalSpeedReviewRequired: true,
  decision: 'pending',
  baseline: {
    label: 'current canonical camera-only benchmark',
    scenePath: baselineScene,
    videoPath: baselineVideo,
    checksum: await sha256(baselineVideo),
  },
  candidate: {
    label: 'Level 2 environmental motion candidate',
    scenePath: candidateScene,
    videoPath: candidateVideo,
    checksum: await sha256(candidateVideo),
    claimedNewImprovements: [
      'black-water surface shimmer',
      'soft dawn reflected-light pulse',
      'low-opacity dawn mist',
    ],
  },
  comparison: {
    left: 'baseline',
    right: 'candidate',
    videoPath: abVideo,
    checksum: await sha256(abVideo),
  },
  authority: {
    animationV1Modified: false,
    promotionRequested: false,
    technicalPassMayNotOverrideHumanReview: true,
  },
});

console.log('');
console.log(`A/B video: ${abVideo}`);
console.log(`Proof receipt: ${proofPath}`);
console.log('Review at normal speed. Keep the Level 2 milestone pending unless the RIGHT side is clearly preferable and all three new improvements are readable.');

async function renderScene(scenePath, outputDirectory, label) {
  console.log(`Rendering ${label}: ${scenePath}`);
  await run(
    'pnpm',
    [
      'exec',
      'tsx',
      'tools/scripts/render-scene-v2-benchmark.ts',
      scenePath,
    ],
    root,
    {
      SCENE_V2_BENCHMARK_OUTPUT_DIRECTORY: outputDirectory,
    },
  );
}

async function run(command, args, cwd, extraEnv = {}) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...extraEnv },
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
          `${command} failed with ${signal ? `signal ${signal}` : `exit code ${code ?? 'unknown'}`}.`,
        ),
      );
    });
  });
}
