import 'dotenv/config';
import { spawn } from 'node:child_process';
import { copyFile, mkdir, readFile, readdir } from 'node:fs/promises';
import {
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
const PREVIEW_BASE = resolve('tmp/animation-previews');
const SCENE_ROOT = resolve('tools/animation/scenes');
const ASSET_ROOT = resolve('assets');

interface CliOptions {
  shotNumber: number;
  scene?: string;
  showReviewGuides: boolean;
}

interface CanonicalEvidence {
  layerId: string;
  canonicalPath: string;
  checksum: string;
  dimensions: { width: number; height: number };
  qaPath: string;
  qaType: string;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const shot = manifest.shots?.find(
    (item: { sourceShotNumber?: number }) =>
      item.sourceShotNumber === options.shotNumber,
  );
  if (!shot) {
    throw new Error(`Shot ${options.shotNumber} is not present in animation-v1.`);
  }
  if (shot.status !== 'approved') {
    throw new Error(
      `Shot ${options.shotNumber} is ${shot.status ?? 'unknown'}, not approved; canonical retrospective staging only accepts approved shots.`,
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
  assertInside(ASSET_ROOT, sourcePath, 'Editorial source');
  const sourceBytes = await readFile(sourcePath);
  const sourceDimensions = readPngDimensions(sourceBytes, 'Editorial source');

  const shotLabel = String(options.shotNumber).padStart(2, '0');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const previewRoot = resolve(PREVIEW_BASE, `shot${shotLabel}-layered-preview`);
  const outputDirectory = join(previewRoot, stamp);
  const publicDirectory = join(outputDirectory, 'public');
  const stagedAssetRoot = join(
    publicDirectory,
    'canonical-audit-assets',
    `shot${shotLabel}`,
  );
  const qaDirectory = join(outputDirectory, 'canonical-provenance-qa');
  await mkdir(stagedAssetRoot, { recursive: true });
  await mkdir(qaDirectory, { recursive: true });

  const stagedSource = join(publicDirectory, shot.sourceFrame);
  await mkdir(dirname(stagedSource), { recursive: true });
  await copyFile(sourcePath, stagedSource);

  const requiredSet = new Set(requiredIds);
  const evidenceById = new Map<string, CanonicalEvidence>();
  const auditLayers = [];

  for (const layer of shot.layers ?? []) {
    if (layer.state !== 'approved' || !layer.path) {
      auditLayers.push({ ...layer });
      continue;
    }

    const canonicalPath = resolve(ASSET_ROOT, layer.path);
    assertInside(ASSET_ROOT, canonicalPath, `Canonical layer ${layer.id}`);
    const bytes = await readFile(canonicalPath);
    const dimensions = readPngDimensions(bytes, layer.id);
    if (
      dimensions.width !== sourceDimensions.width ||
      dimensions.height !== sourceDimensions.height
    ) {
      throw new Error(
        `${layer.id} is ${dimensions.width}x${dimensions.height}; expected editorial registration ${sourceDimensions.width}x${sourceDimensions.height}.`,
      );
    }

    const checksum = await sha256(canonicalPath);
    if (layer.sha256 && normalizeChecksum(layer.sha256) !== normalizeChecksum(checksum)) {
      throw new Error(
        `${layer.id} checksum does not match animation-v1 manifest. expected=${layer.sha256} actual=${checksum}`,
      );
    }

    if (requiredSet.has(layer.id)) {
      if (layer.review?.status !== 'approved') {
        throw new Error(
          `Required canonical layer ${layer.id} is not human-approved in the manifest.`,
        );
      }
      if (!layer.sha256) {
        throw new Error(`Required canonical layer ${layer.id} has no manifest checksum.`);
      }
    }

    const stagedRelativePath = `canonical-audit-assets/shot${shotLabel}/${safeName(layer.id)}.png`;
    const stagedPath = join(publicDirectory, stagedRelativePath);
    await copyFile(canonicalPath, stagedPath);
    auditLayers.push({
      ...layer,
      path: stagedRelativePath,
    });

    if (requiredSet.has(layer.id)) {
      const qaPath = join(qaDirectory, `${safeName(layer.id)}.json`);
      await writeJson(qaPath, {
        schemaVersion: 1,
        verificationType: 'canonical-approved-checksum-qa',
        generatedAt: new Date().toISOString(),
        sourceShotNumber: options.shotNumber,
        layerId: layer.id,
        candidatePath: canonicalPath,
        pass: true,
        state: layer.state,
        humanReviewStatus: layer.review?.status ?? null,
        expectedChecksum: layer.sha256,
        actualChecksum: checksum,
        dimensions,
        readOnly: true,
        priorHumanApprovalPreserved: true,
        interpretation:
          'The retrospective audit stages the already-approved canonical asset only after verifying manifest approval, exact dimensions, and SHA-256 provenance. The canonical file is never mutated.',
      });
      evidenceById.set(layer.id, {
        layerId: layer.id,
        canonicalPath,
        checksum,
        dimensions,
        qaPath,
        qaType: 'canonical-approved-checksum-qa',
      });
    }
  }

  for (const layerId of requiredIds) {
    if (!evidenceById.has(layerId)) {
      throw new Error(
        `Required canonical layer ${layerId} is missing, not approved, or could not be staged.`,
      );
    }
  }

  const auditManifest = {
    ...manifest,
    shots: [
      {
        ...shot,
        status: 'approved',
        layers: auditLayers,
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
  await writeJson(stagedManifestPath, auditManifest);

  const loaded = await loadSceneV2ForRender(scenePath, publicDirectory);
  const { scene, assetResolution } = loaded;
  if (
    assetResolution.mode !== 'layered' ||
    !assetResolution.layeredShotIds.includes(shot.shotId)
  ) {
    throw new Error(
      `Canonical audit staging did not resolve Shot ${options.shotNumber} as layered. Mode=${assetResolution.mode}; unresolved=${assetResolution.unresolvedRequiredLayerIds.join(', ')}`,
    );
  }

  const config = loadRendererConfig();
  const renderProfile = getLocalRenderProfile();
  const propsPath = join(outputDirectory, 'scene-v2-candidate-props.json');
  const videoPath = join(
    outputDirectory,
    `shot${shotLabel}-layered-canonical-audit-preview.mp4`,
  );
  const previewManifestPath = join(outputDirectory, 'preview-manifest.json');
  const contactSheetPath = join(outputDirectory, 'review-contact-sheet.png');
  await writeJson(propsPath, {
    scene,
    showReviewGuides: options.showReviewGuides,
  });

  console.log(`Shot ${options.shotNumber} canonical Scene V2 retrospective staging`);
  console.log('[ok] source mode: approved canonical animation-v1 assets');
  console.log(
    `[ok] shared editorial registration: ${sourceDimensions.width}x${sourceDimensions.height}`,
  );
  console.log(`[ok] render canvas: ${scene.width}x${scene.height} @ ${scene.fps} fps`);
  console.log(`[ok] renderer resolution: ${assetResolution.mode}`);
  for (const layerId of requiredIds) {
    const evidence = evidenceById.get(layerId)!;
    console.log(
      `[ok] ${layerId}: manifest approval + checksum provenance PASS · ${evidence.checksum.slice(0, 20)}…`,
    );
  }
  console.log('');
  console.log(
    `Rendering approved Shot ${options.shotNumber} through production Scene V2 renderer for read-only audit...`,
  );
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

  const candidateRecords = requiredIds.map((layerId: string) => {
    const evidence = evidenceById.get(layerId)!;
    return {
      layerId,
      sourceMode: 'canonical-approved',
      candidateRunDirectory: dirname(evidence.canonicalPath),
      candidatePath: evidence.canonicalPath,
      candidateChecksum: evidence.checksum,
      dimensions: evidence.dimensions,
      qaPath: evidence.qaPath,
      qaType: evidence.qaType,
      coverageAdvisory: null,
    };
  });

  await writeJson(previewManifestPath, {
    schemaVersion: 1,
    previewType: `shot${shotLabel}-layered-candidate-preview`,
    previewPurpose: 'canonical-approved-retrospective-audit',
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
      required: false,
      stillnessAnchor: scene.shots[0]?.stillnessAnchor ?? null,
      eyeTarget: scene.shots[0]?.eyeTarget ?? null,
      emotionalPurpose: scene.shots[0]?.emotionalPurpose ?? null,
      priorApprovalPreserved: true,
    },
    approvalPolicy: {
      manifestMutated: false,
      candidatesPromoted: false,
      animationV1Modified: false,
      humanApprovalRequired: false,
      priorHumanApprovalPreserved: true,
      automaticDowngradeAllowed: false,
      purpose:
        'Read-only retrospective audit of the exact currently approved animation-v1 assets through the modern production reviewer.',
    },
  });

  console.log('');
  console.log(`Rendered canonical audit preview: ${videoPath}`);
  console.log(`Render time: ${(renderDurationMs / 1000).toFixed(1)}s`);
  console.log(`Review contact sheet: ${contactSheetPath}`);
  console.log(`Preview manifest: ${previewManifestPath}`);
  console.log('The canonical animation-v1 manifest and production assets were NOT modified.');
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

function normalizeChecksum(value: string): string {
  return value.startsWith('sha256:') ? value.slice('sha256:'.length) : value;
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
