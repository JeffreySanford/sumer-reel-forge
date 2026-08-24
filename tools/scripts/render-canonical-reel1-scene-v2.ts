import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  isExactEditorialSourceLayer,
  type AnimationAssetManifest,
} from '../animation/src/animation-asset-manifest';
import { loadSceneV2ForRender } from '../animation/src/scene-v2-asset-loader';
import { assertSceneV2, type SceneV2 } from '../animation/src/scene-v2';
import {
  formatLocalRenderProfile,
  getLocalRenderProfile,
  remotionPerformanceArgs,
} from '../animation/src/local-render-profile';
import { sha256, writeJson } from '../renderer/artifact-utils.mjs';

const ASSET_ROOT = resolve('assets');
const MANIFEST_PATH = resolve(
  ASSET_ROOT,
  'blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const SCENE_PATHS = [
  'tools/animation/scenes/reel-01-shot-01-black-water-benchmark.scene-v2.json',
  'tools/animation/scenes/reel-01-shot-02-stag-coastline-benchmark.scene-v2.json',
  'tools/animation/scenes/reel-01-shot-03-benchmark.scene-v2.json',
  'tools/animation/scenes/reel-01-shot-04-nammu-benchmark.scene-v2.json',
  'tools/animation/scenes/reel-01-shot-05-traveler-shrine-benchmark.scene-v2.json',
  'tools/animation/scenes/reel-01-shot-06-values-benchmark.scene-v2.json',
  'tools/animation/scenes/reel-01-shot-07-dilmun-reveal-benchmark.scene-v2.json',
  'tools/animation/scenes/reel-01-shot-08-landfall-title-benchmark.scene-v2.json',
] as const;

const outputDirectory = resolve(
  process.env.ANIMATION_PROOF_OUTPUT_DIRECTORY ??
    'tmp/renders/canonical-reel1-scene-v2',
);
await mkdir(outputDirectory, { recursive: true });

const manifest = JSON.parse(
  await readFile(MANIFEST_PATH, 'utf8'),
) as AnimationAssetManifest;
await verifyCanonicalManifest(manifest);

const loadedScenes = [];
for (const [index, scenePath] of SCENE_PATHS.entries()) {
  const loaded = await loadSceneV2ForRender(resolve(scenePath), ASSET_ROOT);
  const expectedShotNumber = index + 1;
  if (loaded.scene.shots.length !== 1) {
    throw new Error(`${scenePath} must contain exactly one shot for canonical Reel 1 assembly.`);
  }
  if (loaded.scene.shots[0].sourceShotNumber !== expectedShotNumber) {
    throw new Error(
      `${scenePath} resolved sourceShotNumber=${loaded.scene.shots[0].sourceShotNumber}; expected ${expectedShotNumber}.`,
    );
  }
  if (
    loaded.assetResolution.mode !== 'layered' ||
    !loaded.assetResolution.layeredShotIds.includes(loaded.scene.shots[0].id)
  ) {
    throw new Error(
      `Shot ${expectedShotNumber} did not resolve to approved layered animation-v1 assets. mode=${loaded.assetResolution.mode}; unresolved=${loaded.assetResolution.unresolvedRequiredLayerIds.join(', ')}`,
    );
  }
  loadedScenes.push(loaded.scene);
}

const first = loadedScenes[0];
for (const scene of loadedScenes.slice(1)) {
  if (
    scene.width !== first.width ||
    scene.height !== first.height ||
    scene.fps !== first.fps
  ) {
    throw new Error('All canonical Reel 1 Scene V2 shots must share width, height, and fps.');
  }
}

let startFrame = 0;
const shots = loadedScenes.map((scene) => {
  const shot = structuredClone(scene.shots[0]);
  shot.startFrame = startFrame;
  startFrame += shot.durationFrames;
  return shot;
});

if (startFrame !== 1800) {
  throw new Error(`Canonical Reel 1 must be exactly 1800 frames; resolved ${startFrame}.`);
}

const combinedScene: SceneV2 = {
  ...structuredClone(first),
  sceneId: 'chapter-01-reel-01-canonical-scene-v2',
  assetVersion: manifest.assetVersion,
  assetStrategy: 'scene-only',
  assetManifestPath: undefined,
  durationFrames: startFrame,
  shots,
  transitions: [],
  reviewMarkers: [],
  sourcePolicy: {
    ...first.sourcePolicy,
    storyMutationAllowed: false,
    visualSource: 'approved-animation-v1-canonical-assets',
  },
};
assertSceneV2(combinedScene);

const propsPath = join(outputDirectory, 'canonical-reel1-scene-v2-props.json');
const sceneEvidencePath = join(outputDirectory, 'canonical-reel1-scene-v2.json');
const visualPath = join(outputDirectory, 'reel-animation-v1-visual.mp4');
await writeJson(propsPath, { scene: combinedScene, showReviewGuides: false });
await writeJson(sceneEvidencePath, combinedScene);

const renderProfile = getLocalRenderProfile();
console.log('Canonical Reel 1 Scene V2 assembly');
console.log(`[ok] approved shots: ${shots.length}/8`);
console.log(`[ok] duration: ${combinedScene.durationFrames} frames / ${combinedScene.durationFrames / combinedScene.fps}s`);
console.log(`[ok] canvas: ${combinedScene.width}x${combinedScene.height} @ ${combinedScene.fps} fps`);
console.log(`[ok] source: approved animation-v1 canonical assets`);
console.log(`Hardware: ${formatLocalRenderProfile(renderProfile)}`);
console.log(`Output: ${visualPath}`);

await run(
  'pnpm',
  [
    'exec',
    'remotion',
    'render',
    resolve('tools/animation/src/index.tsx'),
    'CanonicalReel1',
    visualPath,
    `--props=${propsPath}`,
    `--public-dir=${ASSET_ROOT}`,
    '--codec=h264',
    '--pixel-format=yuv420p',
    ...remotionPerformanceArgs(renderProfile),
    '--overwrite',
  ],
  resolve('.'),
);

console.log(`Rendered canonical Scene V2 Reel 1 visual: ${visualPath}`);
console.log(`Scene evidence: ${sceneEvidencePath}`);

async function verifyCanonicalManifest(manifestValue: AnimationAssetManifest) {
  if (manifestValue.shots.length < 8) {
    throw new Error('animation-v1 manifest does not contain all eight Reel 1 shots.');
  }

  for (const shotNumber of Array.from({ length: 8 }, (_, index) => index + 1)) {
    const shot = manifestValue.shots.find(
      (candidate) => candidate.sourceShotNumber === shotNumber,
    );
    if (!shot) throw new Error(`animation-v1 is missing Shot ${shotNumber}.`);
    if (shot.status !== 'approved') {
      throw new Error(`Shot ${shotNumber} is ${shot.status}, not approved.`);
    }

    const requiredIds = new Set(shot.activationPolicy.requiredLayerIds);
    for (const layerId of requiredIds) {
      const layer = shot.layers.find((candidate) => candidate.id === layerId);
      if (!layer?.path || layer.state !== 'approved' || layer.review.status !== 'approved') {
        throw new Error(`Required Shot ${shotNumber} layer ${layerId} is not canonically approved.`);
      }
      const path = resolve(ASSET_ROOT, layer.path);
      const actual = await sha256(path);
      if (layer.sha256) {
        if (normalizeChecksum(layer.sha256) !== normalizeChecksum(actual)) {
          throw new Error(
            `Shot ${shotNumber} layer ${layerId} checksum mismatch. expected=${layer.sha256} actual=${actual}`,
          );
        }
      } else if (!isExactEditorialSourceLayer(shot, layer)) {
        throw new Error(
          `Required Shot ${shotNumber} layer ${layerId} has no SHA-256 provenance and is not an exact editorial source reference.`,
        );
      }
    }
  }
}

function normalizeChecksum(value: string) {
  return value.toLowerCase().replace(/^sha256:/, '');
}

function run(command: string, args: string[], cwd: string) {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      shell: process.platform === 'win32' && command === 'pnpm',
      stdio: 'inherit',
      windowsHide: true,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} exited with code ${code}.`));
    });
  });
}