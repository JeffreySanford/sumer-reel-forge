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
const PREVIEW_ROOT = resolve('tmp/animation-previews/shot04-layered-preview');
const RENDER_WIDTH = 1080;
const RENDER_HEIGHT = 1920;
const FPS = 30;
const DURATION_FRAMES = 240;

const REQUIRED_LAYERS = [
  'shot04-deep-water-v1',
  'shot04-mid-current-v1',
  'shot04-surface-refraction-v1',
  'shot04-nammu-coherence-mask-v1',
] as const;

interface CliOptions {
  motionStrength: number;
  showReviewGuides: boolean;
}

interface ResolvedCandidate {
  layerId: (typeof REQUIRED_LAYERS)[number];
  candidatePath: string;
  candidateRunDirectory: string;
  qaPath: string;
  qaType: string;
  dimensions: { width: number; height: number };
  coverageAdvisory?: string | null;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
  const renderProfile = getLocalRenderProfile();
  const config = loadRendererConfig();

  const candidates = await Promise.all(
    REQUIRED_LAYERS.map((layerId) => resolveQaPassedCandidate(layerId)),
  );
  const deepWater = requireCandidate(candidates, 'shot04-deep-water-v1');
  const midCurrent = requireCandidate(candidates, 'shot04-mid-current-v1');
  const surfaceRefraction = requireCandidate(
    candidates,
    'shot04-surface-refraction-v1',
  );
  const nammuCoherence = requireCandidate(
    candidates,
    'shot04-nammu-coherence-mask-v1',
  );

  const assetDimensions = deepWater.dimensions;
  for (const candidate of candidates) {
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
    deepWaterAsset: 'shot04-deep-water-candidate.png',
    midCurrentAsset: 'shot04-mid-current-candidate.png',
    surfaceRefractionAsset: 'shot04-surface-refraction-candidate.png',
    nammuCoherenceAsset: 'shot04-nammu-coherence-candidate.png',
  };
  await Promise.all([
    copyFile(deepWater.candidatePath, join(publicDirectory, staged.deepWaterAsset)),
    copyFile(midCurrent.candidatePath, join(publicDirectory, staged.midCurrentAsset)),
    copyFile(
      surfaceRefraction.candidatePath,
      join(publicDirectory, staged.surfaceRefractionAsset),
    ),
    copyFile(
      nammuCoherence.candidatePath,
      join(publicDirectory, staged.nammuCoherenceAsset),
    ),
  ]);

  const props = {
    ...staged,
    motionStrength: options.motionStrength,
    showReviewGuides: options.showReviewGuides,
  };
  const propsPath = join(outputDirectory, 'preview-props.json');
  const videoPath = join(outputDirectory, 'shot04-layered-candidate-preview.mp4');
  const manifestPath = join(outputDirectory, 'preview-manifest.json');
  const contactSheetPath = join(outputDirectory, 'review-contact-sheet.png');
  await writeJson(propsPath, props);

  console.log('Shot 4 layered candidate gate');
  console.log(
    `[ok] shared asset resolution: ${assetDimensions.width}x${assetDimensions.height}`,
  );
  console.log(`[ok] render canvas: ${RENDER_WIDTH}x${RENDER_HEIGHT}`);
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
  console.log('Rendering full Shot 4 environmental-coherence audition...');
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
      'Shot04LayeredCandidatePreview',
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
    { id: 'physical-water', progress: 0 },
    { id: 'unusual-pattern', progress: 0.25 },
    { id: 'recognition', progress: 0.55 },
    { id: 'coherence-peak', progress: 0.75 },
    { id: 'dissolution', progress: 1 },
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
        `[${index}:v]scale=216:384:force_original_aspect_ratio=decrease,pad=216:384:(ow-iw)/2:(oh-ih)/2:black[v${index}]`,
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
    candidates.map(async (candidate) => ({
      layerId: candidate.layerId,
      candidateRunDirectory: candidate.candidateRunDirectory,
      candidatePath: candidate.candidatePath,
      candidateChecksum: await sha256(candidate.candidatePath),
      dimensions: candidate.dimensions,
      qaPath: candidate.qaPath,
      qaType: candidate.qaType,
      coverageAdvisory: candidate.coverageAdvisory ?? null,
    })),
  );

  await writeJson(manifestPath, {
    schemaVersion: 1,
    previewType: 'shot04-layered-candidate-preview',
    generatedAt: new Date().toISOString(),
    projectSlug: 'blessings-of-sumer',
    chapterNumber: 1,
    episodeNumber: 1,
    sourceShotNumber: 4,
    sceneId: 'chapter-01-reel-01-shot-04-nammu-benchmark-v1',
    assetDimensions,
    renderCanvas: {
      width: RENDER_WIDTH,
      height: RENDER_HEIGHT,
      fps: FPS,
      durationFrames: DURATION_FRAMES,
    },
    candidates: candidateRecords,
    motion: {
      preset: 'shot04-environmental-coherence-v1',
      strength: options.motionStrength,
      rules: [
        'Deep-water editorial plate remains the visual stillness anchor.',
        'Mid-current uses restrained phase-offset material drift.',
        'Surface refraction uses subtle upper-water displacement and opacity variation.',
        'Nammu coherence rises and dissolves through source-supported environmental structure rather than character animation.',
        'No hard aura, glowing eyes, mermaid silhouette, horror stinger, or particle explosion.',
      ],
    },
    reviewMarkers: markers,
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
        'Audition all four required Shot 4 editorial-resolution candidates together before production promotion.',
    },
  });

  console.log('');
  console.log(`Rendered layered preview: ${videoPath}`);
  console.log(`Render time: ${(renderDurationMs / 1000).toFixed(1)}s`);
  console.log(`Review contact sheet: ${contactSheetPath}`);
  console.log(`Preview manifest: ${manifestPath}`);
  console.log('No animation-v1 asset or manifest was modified.');
}

async function resolveQaPassedCandidate(
  layerId: (typeof REQUIRED_LAYERS)[number],
): Promise<ResolvedCandidate> {
  for (const candidateRunDirectory of await candidateDirectoriesNewestFirst()) {
    const metadataPath = join(
      candidateRunDirectory,
      'shot-04',
      `${layerId}.candidate.json`,
    );
    if (!(await fileExists(metadataPath))) continue;

    const qaPath =
      layerId === 'shot04-deep-water-v1'
        ? join(candidateRunDirectory, 'deep-water-qa.json')
        : join(candidateRunDirectory, `${layerId}-structure-qa.json`);
    if (!(await fileExists(qaPath))) continue;

    try {
      const metadata = JSON.parse(await readFile(metadataPath, 'utf8')) as {
        layerId?: string;
        candidatePath?: string;
      };
      const qa = JSON.parse(await readFile(qaPath, 'utf8')) as {
        pass?: boolean;
        qaStatus?: string;
        candidatePath?: string;
        coverageAdvisory?: string;
      };
      const qaPass = qa.pass === true || qa.qaStatus === 'PASS';
      if (!qaPass || metadata.layerId !== layerId) continue;

      const candidatePath = resolveCandidatePath(
        qa.candidatePath ?? metadata.candidatePath,
        candidateRunDirectory,
      );
      if (!(await fileExists(candidatePath))) continue;

      return {
        layerId,
        candidatePath,
        candidateRunDirectory,
        qaPath,
        qaType:
          layerId === 'shot04-deep-water-v1'
            ? 'exact-source preservation QA'
            : 'semantic structure QA',
        dimensions: readPngDimensions(
          await readFile(candidatePath),
          layerId,
        ),
        coverageAdvisory: qa.coverageAdvisory ?? null,
      };
    } catch {
      continue;
    }
  }

  throw new Error(
    `No QA-passed ${layerId} candidate was found. Run its generation/verification lane first.`,
  );
}

function requireCandidate(
  candidates: ResolvedCandidate[],
  layerId: (typeof REQUIRED_LAYERS)[number],
): ResolvedCandidate {
  const candidate = candidates.find((item) => item.layerId === layerId);
  if (!candidate) throw new Error(`Could not resolve ${layerId}.`);
  return candidate;
}

async function candidateDirectoriesNewestFirst(): Promise<string[]> {
  try {
    return (await readdir(CANDIDATE_ROOT, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
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
  assertInside(CANDIDATE_ROOT, candidatePath, 'Candidate PNG');
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
      stdio: 'inherit',
      windowsHide: true,
      shell: process.platform === 'win32',
    });
    child.once('error', rejectPromise);
    child.once('exit', (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`${command} failed with exit code ${code ?? 'unknown'}.`));
    });
  });
}

function parseOptions(args: string[]): CliOptions {
  const options: CliOptions = {
    motionStrength: 1,
    showReviewGuides: false,
  };
  for (const arg of args) {
    if (arg.startsWith('--motion-strength=')) {
      const value = Number(arg.slice('--motion-strength='.length));
      if (!Number.isFinite(value) || value < 0 || value > 3) {
        throw new Error('--motion-strength must be between 0 and 3.');
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

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
