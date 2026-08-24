import { spawn } from 'node:child_process';
import {
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
} from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path';
import { sha256, writeJson } from '../renderer/artifact-utils.mjs';
import { loadRendererConfig } from '../renderer/renderer-config.mjs';
import { loadSceneV2ForRender } from '../animation/src/scene-v2-asset-loader';
import {
  formatLocalRenderProfile,
  getLocalRenderProfile,
  remotionPerformanceArgs,
} from '../animation/src/local-render-profile';

const MANIFEST_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const SCENE_PATH = resolve(
  'tools/animation/scenes/reel-01-shot-03-benchmark.scene-v2.json',
);
const ASSET_ROOT = resolve('assets');
const CANDIDATE_ROOT = resolve(
  'tmp/animation-assets/candidates/chapter-01-reel-01-animation-v1',
);
const PREVIEW_ROOT = resolve('tmp/animation-previews/shot03-level2-preview');
const SHOT_NUMBER = 3;

interface CliOptions {
  layerIds: string[];
  showReviewGuides: boolean;
}

interface Candidate {
  layerId: string;
  path: string;
  runDirectory: string;
  qaPath: string;
  qaType: string;
  coverageAdvisory: string | null;
  checksum: string;
  dimensions: { width: number; height: number };
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const shot = manifest.shots?.find(
    (item: { sourceShotNumber?: number }) => item.sourceShotNumber === SHOT_NUMBER,
  );
  if (!shot) throw new Error('Shot 3 is missing from animation-v1 manifest.');

  const layerById = new Map(
    (shot.layers ?? []).map((layer: { id: string }) => [layer.id, layer]),
  );
  for (const layerId of options.layerIds) {
    if (!layerById.has(layerId)) {
      throw new Error(`Shot 3 manifest does not define optional audition layer ${layerId}.`);
    }
  }

  const requiredIds = new Set<string>(
    shot.activationPolicy?.requiredLayerIds ?? [],
  );
  for (const requiredId of requiredIds) {
    const layer = layerById.get(requiredId) as any;
    if (!layer) throw new Error(`Shot 3 is missing required layer ${requiredId}.`);
    if (layer.state !== 'approved' || layer.review?.status !== 'approved') {
      throw new Error(
        `Canonical Shot 3 required layer ${requiredId} must remain approved before a Level 2 optional-layer audition.`,
      );
    }
  }

  const sourcePath = resolve(ASSET_ROOT, shot.sourceFrame);
  const sourceDimensions = readPngDimensions(
    await readFile(sourcePath),
    'Shot 3 editorial source',
  );
  const candidates = await Promise.all(
    options.layerIds.map((layerId) => resolveQaPassedCandidate(layerId)),
  );
  for (const candidate of candidates) {
    if (
      candidate.dimensions.width !== sourceDimensions.width ||
      candidate.dimensions.height !== sourceDimensions.height
    ) {
      throw new Error(
        `${candidate.layerId} is ${candidate.dimensions.width}x${candidate.dimensions.height}; expected ${sourceDimensions.width}x${sourceDimensions.height}.`,
      );
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDirectory = join(PREVIEW_ROOT, stamp);
  const publicDirectory = join(outputDirectory, 'public');
  const stagedCandidateRoot = join(publicDirectory, 'candidate-assets', 'shot03');
  await mkdir(stagedCandidateRoot, { recursive: true });

  const stagedSource = join(publicDirectory, shot.sourceFrame);
  await mkdir(dirname(stagedSource), { recursive: true });
  await copyFile(sourcePath, stagedSource);

  const candidateById = new Map(candidates.map((item) => [item.layerId, item]));
  const auditionLayers = [];
  const canonicalLayers = [];

  for (const layer of shot.layers ?? []) {
    const candidate = candidateById.get(layer.id);
    if (candidate) {
      const stagedRelativePath = `candidate-assets/shot03/${safeName(layer.id)}.png`;
      const stagedPath = join(publicDirectory, stagedRelativePath);
      await copyFile(candidate.path, stagedPath);
      auditionLayers.push({
        ...layer,
        path: stagedRelativePath,
        state: 'approved',
        sha256: candidate.checksum,
        review: {
          status: 'approved',
          notes: [
            'TEMPORARY LEVEL 2 AUDITION ONLY — canonical animation-v1 manifest remains unchanged.',
            `Upstream ${candidate.qaType} PASS: ${candidate.qaPath}`,
          ],
        },
      });
      continue;
    }

    if (layer.state === 'approved' && layer.review?.status === 'approved') {
      const canonicalSource = resolve(ASSET_ROOT, layer.path);
      const stagedCanonical = join(publicDirectory, layer.path);
      await mkdir(dirname(stagedCanonical), { recursive: true });
      await verifyCanonicalChecksum(layer, canonicalSource);
      await copyFile(canonicalSource, stagedCanonical);
      canonicalLayers.push(layer.id);
    }
    auditionLayers.push({ ...layer });
  }

  const auditionManifest = {
    ...manifest,
    shots: [
      {
        ...shot,
        status: 'approved',
        layers: auditionLayers,
      },
    ],
  };

  const sourceScene = JSON.parse(await readFile(SCENE_PATH, 'utf8'));
  if (!sourceScene.assetManifestPath) {
    throw new Error('Shot 3 Scene V2 benchmark does not declare assetManifestPath.');
  }
  const stagedManifestPath = join(publicDirectory, sourceScene.assetManifestPath);
  await mkdir(dirname(stagedManifestPath), { recursive: true });
  await writeJson(stagedManifestPath, auditionManifest);

  const loaded = await loadSceneV2ForRender(SCENE_PATH, publicDirectory);
  const { scene, assetResolution } = loaded;
  if (
    assetResolution.mode !== 'layered' ||
    !assetResolution.layeredShotIds.includes(shot.shotId)
  ) {
    throw new Error(
      `Level 2 audition did not resolve Shot 3 as layered. Mode=${assetResolution.mode}; unresolved=${assetResolution.unresolvedRequiredLayerIds.join(', ')}`,
    );
  }

  const resolvedShot = scene.shots.find(
    (item: { sourceShotNumber?: number }) => item.sourceShotNumber === SHOT_NUMBER,
  );
  if (!resolvedShot) throw new Error('Resolved Level 2 audition is missing Shot 3.');
  for (const layerId of options.layerIds) {
    const active = resolvedShot.layers.some(
      (layer: { assetId?: string; id?: string }) =>
        layer.assetId === layerId || layer.id === layerId,
    );
    if (!active) {
      throw new Error(
        `Optional audition layer ${layerId} was staged but did not activate in resolved Scene V2.`,
      );
    }
  }

  const config = loadRendererConfig();
  const renderProfile = getLocalRenderProfile();
  const propsPath = join(outputDirectory, 'scene-v2-level2-props.json');
  const videoPath = join(outputDirectory, 'shot03-level2-candidate-preview.mp4');
  const previewManifestPath = join(outputDirectory, 'preview-manifest.json');
  const contactSheetPath = join(outputDirectory, 'review-contact-sheet.png');
  await writeJson(propsPath, {
    scene,
    showReviewGuides: options.showReviewGuides,
  });

  console.log('Shot 3 Level 2 optional-layer audition');
  console.log(
    `[ok] canonical required baseline: ${[...requiredIds].join(', ')}`,
  );
  console.log(`[ok] canonical staged layers: ${canonicalLayers.join(', ')}`);
  console.log(`[ok] optional candidates: ${options.layerIds.join(', ')}`);
  console.log(
    `[ok] shared editorial registration: ${sourceDimensions.width}x${sourceDimensions.height}`,
  );
  console.log(`[ok] renderer resolution: ${assetResolution.mode}`);
  for (const candidate of candidates) {
    console.log(
      `[ok] ${candidate.layerId}: ${candidate.qaType} PASS${
        candidate.coverageAdvisory ? ` · ${candidate.coverageAdvisory}` : ''
      } · ${candidate.path}`,
    );
  }
  console.log(`Hardware: ${formatLocalRenderProfile(renderProfile)}`);
  console.log(`Output: ${videoPath}`);

  const startedAt = Date.now();
  await run(
    'pnpm',
    [
      'exec',
      'remotion',
      'render',
      resolve('tools/animation/src/index.tsx'),
      'SceneV2Benchmark',
      videoPath,
      `--props=${propsPath}`,
      `--public-dir=${publicDirectory}`,
      '--codec=h264',
      '--pixel-format=yuv420p',
      ...remotionPerformanceArgs(renderProfile),
      '--overwrite',
    ],
    resolve('.'),
  );
  const renderDurationMs = Date.now() - startedAt;

  const reviewFrames = [];
  for (const marker of scene.reviewMarkers) {
    const frame = Math.min(
      scene.durationFrames - 1,
      Math.round(marker.progress * Math.max(0, scene.durationFrames - 1)),
    );
    const framePath = join(
      outputDirectory,
      `review-${String(frame).padStart(4, '0')}-${marker.id}.png`,
    );
    await run(
      config.ffmpegCommand,
      [
        '-y',
        '-hide_banner',
        '-loglevel',
        'error',
        '-ss',
        (frame / scene.fps).toFixed(6),
        '-i',
        videoPath,
        '-frames:v',
        '1',
        framePath,
      ],
      outputDirectory,
    );
    reviewFrames.push({
      ...marker,
      frame,
      path: framePath,
      checksum: await sha256(framePath),
    });
  }

  if (reviewFrames.length) {
    const scaleWidth = 216;
    const scaleHeight = 384;
    const inputs = reviewFrames.flatMap((frame) => ['-i', frame.path]);
    const scaled = reviewFrames
      .map(
        (_frame, index) =>
          `[${index}:v]scale=${scaleWidth}:${scaleHeight}:force_original_aspect_ratio=decrease,pad=${scaleWidth}:${scaleHeight}:(ow-iw)/2:(oh-ih)/2:black[v${index}]`,
      )
      .join(';');
    const stackInputs = reviewFrames.map((_frame, index) => `[v${index}]`).join('');
    await run(
      config.ffmpegCommand,
      [
        '-y',
        '-hide_banner',
        '-loglevel',
        'error',
        ...inputs,
        '-filter_complex',
        `${scaled};${stackInputs}hstack=inputs=${reviewFrames.length}[sheet]`,
        '-map',
        '[sheet]',
        '-frames:v',
        '1',
        contactSheetPath,
      ],
      outputDirectory,
    );
  }

  await writeJson(previewManifestPath, {
    schemaVersion: 1,
    previewType: 'shot03-level2-optional-layer-audition',
    generatedAt: new Date().toISOString(),
    projectSlug: manifest.projectSlug,
    chapterNumber: manifest.chapterNumber,
    episodeNumber: manifest.episodeNumber,
    sourceShotNumber: SHOT_NUMBER,
    shotId: shot.shotId,
    sceneId: scene.sceneId,
    scenePath: SCENE_PATH,
    baseline: {
      source: 'canonical-approved-animation-v1',
      requiredLayerIds: [...requiredIds],
      stagedCanonicalLayerIds: canonicalLayers,
    },
    optionalCandidateLayerIds: options.layerIds,
    candidates: candidates.map((candidate) => ({
      layerId: candidate.layerId,
      candidateRunDirectory: candidate.runDirectory,
      candidatePath: candidate.path,
      candidateChecksum: candidate.checksum,
      dimensions: candidate.dimensions,
      qaPath: candidate.qaPath,
      qaType: candidate.qaType,
      coverageAdvisory: candidate.coverageAdvisory,
    })),
    assetResolution: {
      mode: assetResolution.mode,
      layeredShotIds: assetResolution.layeredShotIds,
      unresolvedRequiredLayerIds: assetResolution.unresolvedRequiredLayerIds,
    },
    renderCanvas: {
      width: scene.width,
      height: scene.height,
      fps: scene.fps,
      durationFrames: scene.durationFrames,
    },
    reviewMarkers: scene.reviewMarkers,
    showReviewGuides: options.showReviewGuides,
    renderProfile,
    renderDurationMs,
    output: {
      path: videoPath,
      checksum: await sha256(videoPath),
      durationSeconds: scene.durationFrames / scene.fps,
    },
    reviewFrames,
    contactSheet: reviewFrames.length
      ? { path: contactSheetPath, checksum: await sha256(contactSheetPath) }
      : null,
    approvalPolicy: {
      manifestMutated: false,
      candidatesPromoted: false,
      animationV1Modified: false,
      humanApprovalRequired: true,
      purpose:
        'Audition explicitly selected Level 2 optional candidates on the approved canonical Shot 3 baseline before promotion.',
    },
  });

  console.log('');
  console.log(`Rendered Level 2 preview: ${videoPath}`);
  console.log(`Render time: ${(renderDurationMs / 1000).toFixed(1)}s`);
  console.log(`Review contact sheet: ${contactSheetPath}`);
  console.log(`Preview manifest: ${previewManifestPath}`);
  console.log('Canonical animation-v1 assets and manifest were NOT modified.');
}

async function verifyCanonicalChecksum(layer: any, path: string): Promise<void> {
  await access(path);
  if (!layer.sha256) {
    throw new Error(`Approved canonical layer ${layer.id} is missing SHA-256 provenance.`);
  }
  const expected = String(layer.sha256).toLowerCase();
  const actual = (await sha256(path)).toLowerCase();
  if (actual !== expected) {
    throw new Error(
      `Canonical checksum mismatch for ${layer.id}: expected ${expected}, got ${actual}.`,
    );
  }
}

async function resolveQaPassedCandidate(layerId: string): Promise<Candidate> {
  for (const runDirectory of await candidateDirectoriesNewestFirst(CANDIDATE_ROOT)) {
    const runPath = join(runDirectory, 'candidate-run.json');
    if (!(await fileExists(runPath))) continue;
    try {
      const run = JSON.parse(await readFile(runPath, 'utf8'));
      const metadata = (run.candidates ?? []).find(
        (item: { layerId?: string }) => item.layerId === layerId,
      );
      if (!metadata?.candidatePath) continue;
      const path = resolveCandidatePath(metadata.candidatePath, runDirectory);
      if (!(await fileExists(path))) continue;
      const qa = await findPassingQa(runDirectory, layerId);
      if (!qa) continue;
      const bytes = await readFile(path);
      return {
        layerId,
        path,
        runDirectory,
        qaPath: qa.path,
        qaType: qa.type,
        coverageAdvisory: qa.coverageAdvisory,
        checksum: await sha256(path),
        dimensions: readPngDimensions(bytes, layerId),
      };
    } catch {
      continue;
    }
  }
  throw new Error(
    `No QA-passed Shot 3 candidate found for ${layerId}. Generate and verify the optional layer first.`,
  );
}

async function findPassingQa(
  runDirectory: string,
  layerId: string,
): Promise<{ path: string; type: string; coverageAdvisory: string | null } | null> {
  const entries = await readdir(runDirectory, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const path = join(runDirectory, entry.name);
    try {
      const qa = JSON.parse(await readFile(path, 'utf8'));
      const identifiesLayer =
        qa.layerId === layerId ||
        (typeof qa.candidatePath === 'string' &&
          basename(qa.candidatePath).includes(layerId));
      const passes = qa.pass === true || qa.qaStatus === 'PASS';
      if (!identifiesLayer || !passes) continue;
      return {
        path,
        type: qa.type ?? qa.verificationType ?? 'layer QA',
        coverageAdvisory: qa.coverageAdvisory ?? null,
      };
    } catch {
      continue;
    }
  }
  return null;
}

async function candidateDirectoriesNewestFirst(root: string): Promise<string[]> {
  try {
    return (await readdir(root, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
      .map((entry) => join(root, entry.name))
      .sort((a, b) => basename(b).localeCompare(basename(a)));
  } catch {
    return [];
  }
}

function resolveCandidatePath(rawPath: string, runDirectory: string): string {
  const path = isAbsolute(rawPath)
    ? resolve(rawPath)
    : resolve(runDirectory, rawPath);
  assertInside(CANDIDATE_ROOT, path, 'Level 2 candidate PNG');
  return path;
}

function readPngDimensions(
  buffer: Buffer,
  label: string,
): { width: number; height: number } {
  if (
    buffer.length < 24 ||
    buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
    buffer.subarray(12, 16).toString('ascii') !== 'IHDR'
  ) {
    throw new Error(`${label} is not a valid PNG.`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function assertInside(parent: string, child: string, label: string): void {
  const path = relative(resolve(parent), resolve(child));
  if (path.startsWith('..') || isAbsolute(path)) {
    throw new Error(`${label} must remain under ${parent}: ${child}`);
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function parseOptions(args: string[]): CliOptions {
  const result: CliOptions = {
    layerIds: [],
    showReviewGuides: false,
  };
  for (const arg of args) {
    if (arg.startsWith('--layer=')) {
      const value = arg.slice('--layer='.length).trim();
      if (!value) throw new Error(`Invalid ${arg}`);
      if (!result.layerIds.includes(value)) result.layerIds.push(value);
    } else if (arg === '--review-guides') {
      result.showReviewGuides = true;
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  if (!result.layerIds.length) {
    throw new Error('At least one --layer=<optional-layer-id> is required.');
  }
  return result;
}

async function run(command: string, args: string[], cwd: string): Promise<void> {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
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
          `${command} failed with ${signal ? `signal ${signal}` : `exit code ${code ?? 'unknown'}`}.`,
        ),
      );
    });
  });
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
