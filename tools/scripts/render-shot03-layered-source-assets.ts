import 'dotenv/config';
import { spawn } from 'node:child_process';
import { access, copyFile, mkdir, readFile, readdir } from 'node:fs/promises';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import { sha256, writeJson } from '../renderer/artifact-utils.mjs';
import {
  formatLocalRenderProfile,
  getLocalRenderProfile,
  remotionPerformanceArgs,
} from '../animation/src/local-render-profile';
import { loadRendererConfig } from '../renderer/renderer-config.mjs';

const CANDIDATE_ROOT = resolve(
  'tmp/animation-assets/candidates/chapter-01-reel-01-animation-v1',
);
const PREVIEW_ROOT = resolve('tmp/animation-previews/shot03-layered-preview');
const RENDER_WIDTH = 1080;
const RENDER_HEIGHT = 1920;
const FPS = 30;
const DURATION_FRAMES = 210;

const MOTION_LAYERS = [
  {
    layerId: 'shot03-water-v1',
    previewRoot: resolve('tmp/animation-previews/shot03-water-preview'),
  },
  {
    layerId: 'shot03-vessel-v1',
    previewRoot: resolve('tmp/animation-previews/shot03-vessel-preview'),
  },
  {
    layerId: 'shot03-enki-body-v1',
    previewRoot: resolve('tmp/animation-previews/shot03-enki-body-preview'),
  },
] as const;

interface CliOptions {
  motionStrength: number;
  showReviewGuides: boolean;
}

interface ResolvedCandidate {
  layerId: string;
  candidatePath: string;
  candidateRunDirectory: string;
  qaPath: string;
  qaType: string;
  dimensions: { width: number; height: number };
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
  const renderProfile = getLocalRenderProfile();
  const config = loadRendererConfig();

  const background = await resolveBackgroundCandidate();
  const motionCandidates = await Promise.all(
    MOTION_LAYERS.map((target) => resolveMotionCandidate(target)),
  );
  const water = requireCandidate(motionCandidates, 'shot03-water-v1');
  const vessel = requireCandidate(motionCandidates, 'shot03-vessel-v1');
  const enki = requireCandidate(motionCandidates, 'shot03-enki-body-v1');
  const allCandidates = [background, water, vessel, enki];

  const assetDimensions = background.dimensions;
  for (const candidate of allCandidates) {
    if (
      candidate.dimensions.width !== assetDimensions.width ||
      candidate.dimensions.height !== assetDimensions.height
    ) {
      throw new Error(
        `${candidate.layerId} is ${candidate.dimensions.width}x${candidate.dimensions.height}; expected shared editorial asset resolution ${assetDimensions.width}x${assetDimensions.height}.`,
      );
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDirectory = join(PREVIEW_ROOT, stamp);
  const publicDirectory = join(outputDirectory, 'public');
  await mkdir(publicDirectory, { recursive: true });

  const staged = {
    backgroundAsset: 'shot03-background-candidate.png',
    waterAsset: 'shot03-water-candidate.png',
    vesselAsset: 'shot03-vessel-candidate.png',
    enkiAsset: 'shot03-enki-body-candidate.png',
  };
  await Promise.all([
    copyFile(background.candidatePath, join(publicDirectory, staged.backgroundAsset)),
    copyFile(water.candidatePath, join(publicDirectory, staged.waterAsset)),
    copyFile(vessel.candidatePath, join(publicDirectory, staged.vesselAsset)),
    copyFile(enki.candidatePath, join(publicDirectory, staged.enkiAsset)),
  ]);

  const props = {
    ...staged,
    motionStrength: options.motionStrength,
    showReviewGuides: options.showReviewGuides,
  };
  const propsPath = join(outputDirectory, 'preview-props.json');
  const videoPath = join(outputDirectory, 'shot03-layered-candidate-preview.mp4');
  const manifestPath = join(outputDirectory, 'preview-manifest.json');
  const contactSheetPath = join(outputDirectory, 'review-contact-sheet.png');
  await writeJson(propsPath, props);

  console.log('Shot 3 layered candidate gate');
  console.log(
    `[ok] shared asset resolution: ${assetDimensions.width}x${assetDimensions.height}`,
  );
  console.log(`[ok] render canvas: ${RENDER_WIDTH}x${RENDER_HEIGHT}`);
  for (const candidate of allCandidates) {
    console.log(
      `[ok] ${candidate.layerId}: ${candidate.qaType} PASS · ${candidate.candidatePath}`,
    );
  }
  console.log('');
  console.log('Rendering full Shot 3 candidate composite...');
  console.log(`Motion strength: ${options.motionStrength}`);
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
      'Shot03LayeredCandidatePreview',
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

  const markers = [
    { id: 'opening', progress: 0 },
    { id: 'hero', progress: 0.5 },
    { id: 'end', progress: 1 },
  ];
  const reviewFrames: Array<{
    id: string;
    progress: number;
    frame: number;
    path: string;
    checksum: string;
  }> = [];

  for (const marker of markers) {
    const frame = Math.min(
      DURATION_FRAMES - 1,
      Math.round(marker.progress * (DURATION_FRAMES - 1)),
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
        (frame / FPS).toFixed(6),
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

  const inputs = reviewFrames.flatMap((frame) => ['-i', frame.path]);
  const scaled = reviewFrames
    .map(
      (_frame, index) =>
        `[${index}:v]scale=360:640:force_original_aspect_ratio=decrease,pad=360:640:(ow-iw)/2:(oh-ih)/2:black[v${index}]`,
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

  const candidateRecords = await Promise.all(
    allCandidates.map(async (candidate) => ({
      layerId: candidate.layerId,
      candidateRunDirectory: candidate.candidateRunDirectory,
      candidatePath: candidate.candidatePath,
      candidateChecksum: await sha256(candidate.candidatePath),
      dimensions: candidate.dimensions,
      qaPath: candidate.qaPath,
      qaType: candidate.qaType,
    })),
  );

  await writeJson(manifestPath, {
    schemaVersion: 2,
    previewType: 'shot03-layered-candidate-preview',
    generatedAt: new Date().toISOString(),
    projectSlug: 'blessings-of-sumer',
    chapterNumber: 1,
    episodeNumber: 1,
    sourceShotNumber: 3,
    assetDimensions,
    renderCanvas: {
      width: RENDER_WIDTH,
      height: RENDER_HEIGHT,
      fps: FPS,
      durationFrames: DURATION_FRAMES,
    },
    candidates: candidateRecords,
    motion: {
      preset: 'shot03-layered-physical-v1',
      strength: options.motionStrength,
      rules: [
        'Background plate remains stable.',
        'Water receives restrained material drift.',
        'Vessel and Enki share hull inertia so the character remains planted.',
        'Enki receives only micro breathing on top of shared vessel motion.',
      ],
    },
    renderProfile,
    renderDurationMs,
    output: {
      path: videoPath,
      checksum: await sha256(videoPath),
      width: RENDER_WIDTH,
      height: RENDER_HEIGHT,
      fps: FPS,
      durationFrames: DURATION_FRAMES,
      durationSeconds: DURATION_FRAMES / FPS,
    },
    reviewFrames,
    contactSheet: {
      path: contactSheetPath,
      checksum: await sha256(contactSheetPath),
    },
    approvalPolicy: {
      manifestMutated: false,
      candidatesPromoted: false,
      animationV1Modified: false,
      humanApprovalRequired: true,
      purpose:
        'Audition all four required Shot 3 editorial-resolution candidates together on the reel render canvas before production promotion.',
    },
  });

  console.log('');
  console.log(`Rendered layered preview: ${videoPath}`);
  console.log(`Render time: ${(renderDurationMs / 1000).toFixed(1)}s`);
  console.log(`Review contact sheet: ${contactSheetPath}`);
  console.log(`Preview manifest: ${manifestPath}`);
  console.log('No animation-v1 asset or manifest was modified.');
}

async function resolveBackgroundCandidate(): Promise<ResolvedCandidate> {
  for (const candidateRunDirectory of await candidateDirectoriesNewestFirst()) {
    const qaPath = join(candidateRunDirectory, 'background-qa.json');
    const metadataPath = join(
      candidateRunDirectory,
      'shot-03',
      'shot03-background-v1.candidate.json',
    );
    if (!(await fileExists(qaPath)) || !(await fileExists(metadataPath))) continue;
    try {
      const qa = JSON.parse(await readFile(qaPath, 'utf8')) as { pass?: boolean };
      const metadata = JSON.parse(await readFile(metadataPath, 'utf8')) as {
        layerId?: string;
        candidatePath?: string;
      };
      if (qa.pass !== true || metadata.layerId !== 'shot03-background-v1') continue;
      const candidatePath = resolveCandidatePath(
        metadata.candidatePath,
        candidateRunDirectory,
      );
      if (!(await fileExists(candidatePath))) continue;
      return {
        layerId: 'shot03-background-v1',
        candidatePath,
        candidateRunDirectory,
        qaPath,
        qaType: 'background preservation QA',
        dimensions: readPngDimensions(
          await readFile(candidatePath),
          'shot03-background-v1',
        ),
      };
    } catch {
      continue;
    }
  }
  throw new Error(
    'No QA-passed Shot 3 background candidate was found. Run pnpm comfyui:background:generate and pnpm comfyui:background:verify first.',
  );
}

async function resolveMotionCandidate(
  target: (typeof MOTION_LAYERS)[number],
): Promise<ResolvedCandidate> {
  let entries;
  try {
    entries = await readdir(target.previewRoot, { withFileTypes: true });
  } catch {
    throw new Error(
      `No ${target.layerId} preview root found. Run its preview and verify commands first.`,
    );
  }
  const previews = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(target.previewRoot, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));

  for (const previewDirectory of previews) {
    const qaPath = join(previewDirectory, 'motion-qa.json');
    const manifestPath = join(previewDirectory, 'preview-manifest.json');
    if (!(await fileExists(qaPath)) || !(await fileExists(manifestPath))) continue;
    try {
      const qa = JSON.parse(await readFile(qaPath, 'utf8')) as { pass?: boolean };
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
        layerId?: string;
        candidate?: { runDirectory?: string; path?: string };
      };
      if (qa.pass !== true || manifest.layerId !== target.layerId) continue;
      if (!manifest.candidate?.runDirectory || !manifest.candidate.path) continue;

      const candidateRunDirectory = resolve(manifest.candidate.runDirectory);
      assertInside(
        CANDIDATE_ROOT,
        candidateRunDirectory,
        `${target.layerId} candidate run`,
      );
      const candidatePath = isAbsolute(manifest.candidate.path)
        ? resolve(manifest.candidate.path)
        : resolve(candidateRunDirectory, manifest.candidate.path);
      assertInside(
        candidateRunDirectory,
        candidatePath,
        `${target.layerId} candidate PNG`,
      );
      if (!(await fileExists(candidatePath))) continue;

      return {
        layerId: target.layerId,
        candidatePath,
        candidateRunDirectory,
        qaPath,
        qaType: 'rendered-motion QA',
        dimensions: readPngDimensions(
          await readFile(candidatePath),
          target.layerId,
        ),
      };
    } catch {
      continue;
    }
  }
  throw new Error(
    `No QA-passed ${target.layerId} preview was found. Run its preview and verify commands first.`,
  );
}

function requireCandidate(
  candidates: ResolvedCandidate[],
  layerId: string,
): ResolvedCandidate {
  const candidate = candidates.find((item) => item.layerId === layerId);
  if (!candidate) throw new Error(`Could not resolve ${layerId}.`);
  return candidate;
}

async function candidateDirectoriesNewestFirst(): Promise<string[]> {
  try {
    return (await readdir(CANDIDATE_ROOT, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(CANDIDATE_ROOT, entry.name))
      .sort((a, b) => basename(b).localeCompare(basename(a)));
  } catch {
    return [];
  }
}

function resolveCandidatePath(
  rawPath: string | undefined,
  runDirectory: string,
): string {
  if (!rawPath) throw new Error('Candidate metadata is missing candidatePath.');
  const candidatePath = isAbsolute(rawPath)
    ? resolve(rawPath)
    : resolve(runDirectory, rawPath);
  assertInside(runDirectory, candidatePath, 'Candidate PNG');
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

function parseOptions(args: string[]): CliOptions {
  const options: CliOptions = {
    motionStrength: 1,
    showReviewGuides: false,
  };
  for (const arg of args) {
    if (arg.startsWith('--motion-strength=')) {
      const value = Number(arg.slice('--motion-strength='.length));
      if (!Number.isFinite(value) || value < 0 || value > 2) {
        throw new Error('--motion-strength must be between 0 and 2.');
      }
      options.motionStrength = value;
    } else if (arg === '--review-guides') {
      options.showReviewGuides = true;
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  return options;
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
      if (code === 0) resolvePromise();
      else {
        rejectPromise(
          new Error(
            `${command} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}.`,
          ),
        );
      }
    });
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
