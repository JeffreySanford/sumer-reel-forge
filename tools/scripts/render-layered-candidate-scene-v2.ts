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

const DEFAULT_MANIFEST = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const CANDIDATE_BASE = resolve('tmp/animation-assets/candidates');
const PREVIEW_BASE = resolve('tmp/animation-previews');
const SCENE_ROOT = resolve('tools/animation/scenes');
const ASSET_ROOT = resolve('assets');

interface CliOptions {
  shotNumber: number;
  manifest?: string;
  scene?: string;
  showReviewGuides: boolean;
}

interface ResolvedCandidate {
  layerId: string;
  candidatePath: string;
  candidateRunDirectory: string;
  qaPath: string;
  qaType: string;
  coverageAdvisory: string | null;
  dimensions: { width: number; height: number };
  checksum: string;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
  const manifestPath = resolve(options.manifest ?? DEFAULT_MANIFEST);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const shot = manifest.shots?.find(
    (item: { sourceShotNumber?: number }) =>
      item.sourceShotNumber === options.shotNumber,
  );
  if (!shot) {
    throw new Error(
      `Shot ${options.shotNumber} is not admitted into animation-v1. Run the shot-contract admission gate first.`,
    );
  }

  const requiredIds = [...(shot.activationPolicy?.requiredLayerIds ?? [])];
  if (!requiredIds.length) {
    throw new Error(`Shot ${options.shotNumber} has no required activation layers.`);
  }
  const scenePath = options.scene
    ? resolve(options.scene)
    : await findSceneForShot(shot.shotId, options.shotNumber);
  const sourcePath = resolve(ASSET_ROOT, shot.sourceFrame);
  const sourceBytes = await readFile(sourcePath);
  const sourceDimensions = readPngDimensions(sourceBytes, 'Editorial source');
  const candidateRoot = resolve(CANDIDATE_BASE, manifest.manifestId);
  const candidates = await Promise.all(
    requiredIds.map((layerId: string) =>
      resolveQaPassedCandidate(candidateRoot, options.shotNumber, layerId),
    ),
  );

  for (const candidate of candidates) {
    if (
      candidate.dimensions.width !== sourceDimensions.width ||
      candidate.dimensions.height !== sourceDimensions.height
    ) {
      throw new Error(
        `${candidate.layerId} is ${candidate.dimensions.width}x${candidate.dimensions.height}; expected editorial registration ${sourceDimensions.width}x${sourceDimensions.height}.`,
      );
    }
  }

  const shotLabel = String(options.shotNumber).padStart(2, '0');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const previewRoot = resolve(PREVIEW_BASE, `shot${shotLabel}-layered-preview`);
  const outputDirectory = join(previewRoot, stamp);
  const publicDirectory = join(outputDirectory, 'public');
  const stagedCandidateRoot = join(publicDirectory, 'candidate-assets', `shot${shotLabel}`);
  await mkdir(stagedCandidateRoot, { recursive: true });

  const stagedSource = join(publicDirectory, shot.sourceFrame);
  await mkdir(dirname(stagedSource), { recursive: true });
  await copyFile(sourcePath, stagedSource);

  const candidateById = new Map(candidates.map((item) => [item.layerId, item]));
  const auditionLayers = [];
  for (const layer of shot.layers ?? []) {
    const candidate = candidateById.get(layer.id);
    if (!candidate) {
      auditionLayers.push({ ...layer });
      continue;
    }
    const stagedRelativePath = `candidate-assets/shot${shotLabel}/${safeName(layer.id)}.png`;
    const stagedPath = join(publicDirectory, stagedRelativePath);
    await copyFile(candidate.candidatePath, stagedPath);
    auditionLayers.push({
      ...layer,
      path: stagedRelativePath,
      state: 'approved',
      sha256: candidate.checksum,
      review: {
        status: 'approved',
        notes: [
          'TEMPORARY CANDIDATE AUDITION ONLY — canonical animation-v1 manifest remains unchanged.',
          `Upstream ${candidate.qaType} PASS: ${candidate.qaPath}`,
        ],
      },
    });
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
  const sourceScene = JSON.parse(await readFile(scenePath, 'utf8'));
  if (!sourceScene.assetManifestPath) {
    throw new Error(
      `Scene ${sourceScene.sceneId ?? scenePath} does not declare assetManifestPath.`,
    );
  }
  const stagedManifestPath = join(publicDirectory, sourceScene.assetManifestPath);
  await mkdir(dirname(stagedManifestPath), { recursive: true });
  await writeJson(stagedManifestPath, auditionManifest);

  const loaded = await loadSceneV2ForRender(scenePath, publicDirectory);
  const { scene, assetResolution } = loaded;
  if (
    assetResolution.mode !== 'layered' ||
    !assetResolution.layeredShotIds.includes(shot.shotId)
  ) {
    throw new Error(
      `Candidate audition did not resolve Shot ${options.shotNumber} as layered. Mode=${assetResolution.mode}; unresolved=${assetResolution.unresolvedRequiredLayerIds.join(', ')}`,
    );
  }

  const config = loadRendererConfig();
  const renderProfile = getLocalRenderProfile();
  const propsPath = join(outputDirectory, 'scene-v2-candidate-props.json');
  const videoPath = join(
    outputDirectory,
    `shot${shotLabel}-layered-candidate-preview.mp4`,
  );
  const previewManifestPath = join(outputDirectory, 'preview-manifest.json');
  const contactSheetPath = join(outputDirectory, 'review-contact-sheet.png');
  await writeJson(propsPath, {
    scene,
    showReviewGuides: options.showReviewGuides,
  });

  console.log(`Shot ${options.shotNumber} generic Scene V2 candidate gate`);
  console.log(
    `[ok] shared editorial registration: ${sourceDimensions.width}x${sourceDimensions.height}`,
  );
  console.log(`[ok] render canvas: ${scene.width}x${scene.height} @ ${scene.fps} fps`);
  console.log(`[ok] renderer resolution: ${assetResolution.mode}`);
  for (const candidate of candidates) {
    console.log(
      `[ok] ${candidate.layerId}: ${candidate.qaType} PASS${
        candidate.coverageAdvisory
          ? ` · ${candidate.coverageAdvisory}`
          : ''
      } · ${candidate.candidatePath}`,
    );
  }
  console.log('');
  console.log(`Rendering Shot ${options.shotNumber} through production Scene V2 renderer...`);
  console.log(`Scene: ${scenePath}`);
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

  const reviewFrames: Array<{
    id: string;
    progress: number;
    frame: number;
    path: string;
    checksum: string;
  }> = [];
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
    const stackInputs = reviewFrames
      .map((_frame, index) => `[v${index}]`)
      .join('');
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

  const candidateRecords = candidates.map((candidate) => ({
    layerId: candidate.layerId,
    candidateRunDirectory: candidate.candidateRunDirectory,
    candidatePath: candidate.candidatePath,
    candidateChecksum: candidate.checksum,
    dimensions: candidate.dimensions,
    qaPath: candidate.qaPath,
    qaType: candidate.qaType,
    coverageAdvisory: candidate.coverageAdvisory,
  }));

  await writeJson(previewManifestPath, {
    schemaVersion: 1,
    previewType: `shot${shotLabel}-layered-candidate-preview`,
    generatedAt: new Date().toISOString(),
    projectSlug: manifest.projectSlug,
    chapterNumber: manifest.chapterNumber,
    episodeNumber: manifest.episodeNumber,
    sourceShotNumber: options.shotNumber,
    shotId: shot.shotId,
    sceneId: scene.sceneId,
    scenePath,
    assetDimensions: sourceDimensions,
    renderCanvas: {
      width: scene.width,
      height: scene.height,
      fps: scene.fps,
      durationFrames: scene.durationFrames,
    },
    candidates: candidateRecords,
    assetResolution: {
      mode: assetResolution.mode,
      layeredShotIds: assetResolution.layeredShotIds,
      unresolvedRequiredLayerIds: assetResolution.unresolvedRequiredLayerIds,
    },
    reviewMarkers: scene.reviewMarkers,
    showReviewGuides: options.showReviewGuides,
    renderProfile,
    renderDurationMs,
    output: {
      path: videoPath,
      checksum: await sha256(videoPath),
      width: scene.width,
      height: scene.height,
      fps: scene.fps,
      durationFrames: scene.durationFrames,
      durationSeconds: scene.durationFrames / scene.fps,
    },
    reviewFrames,
    contactSheet: reviewFrames.length
      ? { path: contactSheetPath, checksum: await sha256(contactSheetPath) }
      : null,
    humanReview: {
      required: true,
      stillnessAnchor: scene.shots[0]?.stillnessAnchor ?? null,
      eyeTarget: scene.shots[0]?.eyeTarget ?? null,
      emotionalPurpose: scene.shots[0]?.emotionalPurpose ?? null,
    },
    approvalPolicy: {
      manifestMutated: false,
      candidatesPromoted: false,
      animationV1Modified: false,
      humanApprovalRequired: true,
      purpose:
        'Audition the exact QA-passed required candidates through the production Scene V2 renderer before canonical promotion.',
    },
  });

  console.log('');
  console.log(`Rendered layered preview: ${videoPath}`);
  console.log(`Render time: ${(renderDurationMs / 1000).toFixed(1)}s`);
  console.log(`Review contact sheet: ${contactSheetPath}`);
  console.log(`Preview manifest: ${previewManifestPath}`);
  console.log('The canonical animation-v1 manifest and production assets were NOT modified.');
}

async function resolveQaPassedCandidate(
  candidateRoot: string,
  shotNumber: number,
  layerId: string,
): Promise<ResolvedCandidate> {
  for (const candidateRunDirectory of await candidateDirectoriesNewestFirst(candidateRoot)) {
    const runPath = join(candidateRunDirectory, 'candidate-run.json');
    if (!(await fileExists(runPath))) continue;
    try {
      const run = JSON.parse(await readFile(runPath, 'utf8'));
      const metadata = (run.candidates ?? []).find(
        (item: { layerId?: string }) => item.layerId === layerId,
      );
      if (!metadata?.candidatePath) continue;
      const candidatePath = resolveCandidatePath(
        metadata.candidatePath,
        candidateRunDirectory,
        candidateRoot,
      );
      if (!(await fileExists(candidatePath))) continue;
      const qa = await findPassingQa(candidateRunDirectory, layerId);
      if (!qa) continue;
      const bytes = await readFile(candidatePath);
      return {
        layerId,
        candidatePath,
        candidateRunDirectory,
        qaPath: qa.path,
        qaType: qa.type,
        coverageAdvisory: qa.coverageAdvisory,
        dimensions: readPngDimensions(bytes, layerId),
        checksum: await sha256(candidatePath),
      };
    } catch {
      continue;
    }
  }
  throw new Error(
    `No QA-passed Shot ${shotNumber} candidate was found for ${layerId}. Run its production lane first.`,
  );
}

async function findPassingQa(
  runDirectory: string,
  layerId: string,
): Promise<{ path: string; type: string; coverageAdvisory: string | null } | null> {
  const entries = await readdir(runDirectory, { withFileTypes: true });
  const likely = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => join(runDirectory, entry.name));
  for (const path of likely) {
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

async function findSceneForShot(
  shotId: string,
  shotNumber: number,
): Promise<string> {
  const entries = await readdir(SCENE_ROOT, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.scene-v2.json')) continue;
    const path = join(SCENE_ROOT, entry.name);
    try {
      const scene = JSON.parse(await readFile(path, 'utf8'));
      if (
        scene.shots?.some(
          (item: { id?: string; sourceShotNumber?: number }) =>
            item.id === shotId || item.sourceShotNumber === shotNumber,
        )
      ) {
        return path;
      }
    } catch {
      // Continue until a valid matching Scene V2 benchmark is found.
    }
  }
  throw new Error(`No Scene V2 benchmark found for Shot ${shotNumber} / ${shotId}.`);
}

function resolveCandidatePath(
  rawPath: string,
  runDirectory: string,
  candidateRoot: string,
): string {
  const candidatePath = isAbsolute(rawPath)
    ? resolve(rawPath)
    : resolve(runDirectory, rawPath);
  assertInside(candidateRoot, candidatePath, 'Candidate PNG');
  return candidatePath;
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

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function assertInside(parent: string, child: string, label: string): void {
  const path = relative(resolve(parent), resolve(child));
  if (path.startsWith('..') || isAbsolute(path)) {
    throw new Error(`${label} must remain under ${parent}: ${child}`);
  }
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

function parseOptions(args: string[]): CliOptions {
  const result: CliOptions = {
    shotNumber: 0,
    showReviewGuides: false,
  };
  for (const arg of args) {
    if (arg.startsWith('--shot=')) {
      const value = Number(arg.slice('--shot='.length));
      if (!Number.isInteger(value) || value < 1) throw new Error(`Invalid ${arg}`);
      result.shotNumber = value;
    } else if (arg.startsWith('--manifest=')) {
      result.manifest = arg.slice('--manifest='.length);
    } else if (arg.startsWith('--scene=')) {
      result.scene = arg.slice('--scene='.length);
    } else if (arg === '--review-guides') {
      result.showReviewGuides = true;
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  if (!result.shotNumber) throw new Error('--shot=<number> is required.');
  return result;
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
