import 'dotenv/config';
import { spawn } from 'node:child_process';
import { access, copyFile, mkdir, readFile, readdir } from 'node:fs/promises';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import { sha256, writeJson } from '../renderer/artifact-utils.mjs';
import { loadRendererConfig } from '../renderer/renderer-config.mjs';
import {
  formatLocalRenderProfile,
  getLocalRenderProfile,
  remotionPerformanceArgs,
} from '../animation/src/local-render-profile';

const LAYER_ID = 'shot03-enki-body-v1';
const CANDIDATE_ROOT = resolve(
  'tmp/animation-assets/candidates/chapter-01-reel-01-animation-v1',
);
const PREVIEW_ROOT = resolve('tmp/animation-previews/shot03-enki-body-preview');
const SOURCE_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-03.png',
);
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const DURATION_FRAMES = 150;

interface CliOptions {
  candidateDir?: string;
  motionStrength: number;
  showReviewGuides: boolean;
}

interface CandidateRunManifest {
  generatedAt?: string;
  candidates?: Array<Record<string, unknown>>;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
  const config = loadRendererConfig();
  const renderProfile = getLocalRenderProfile();
  const candidate = await resolveEnkiCandidate(options.candidateDir);

  const [sourceBuffer, candidateBuffer] = await Promise.all([
    readFile(SOURCE_PATH),
    readFile(candidate.path),
  ]);
  const sourceDimensions = readPngDimensions(sourceBuffer, SOURCE_PATH);
  const candidateDimensions = readPngDimensions(candidateBuffer, candidate.path);
  if (
    sourceDimensions.width !== candidateDimensions.width ||
    sourceDimensions.height !== candidateDimensions.height
  ) {
    throw new Error(
      `Candidate dimensions ${candidateDimensions.width}x${candidateDimensions.height} do not match source ${sourceDimensions.width}x${sourceDimensions.height}.`,
    );
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDirectory = join(PREVIEW_ROOT, stamp);
  const publicDirectory = join(outputDirectory, 'public');
  await mkdir(publicDirectory, { recursive: true });

  const sourceName = 'shot03-editorial-source.png';
  const enkiName = 'shot03-enki-body-candidate.png';
  await Promise.all([
    copyFile(SOURCE_PATH, join(publicDirectory, sourceName)),
    copyFile(candidate.path, join(publicDirectory, enkiName)),
  ]);

  const props = {
    sourceAsset: sourceName,
    enkiAsset: enkiName,
    motionStrength: options.motionStrength,
    showReviewGuides: options.showReviewGuides,
  };
  const propsPath = join(outputDirectory, 'preview-props.json');
  const videoPath = join(outputDirectory, 'shot03-enki-body-candidate-preview.mp4');
  const manifestPath = join(outputDirectory, 'preview-manifest.json');
  const contactSheetPath = join(outputDirectory, 'review-contact-sheet.png');
  await writeJson(propsPath, props);

  console.log('Rendering Shot 3 Enki body candidate preview...');
  console.log(`Candidate run: ${candidate.runDirectory}`);
  console.log(`Candidate PNG: ${candidate.path}`);
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
      'Shot03EnkiBodyCandidatePreview',
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

  await writeJson(manifestPath, {
    schemaVersion: 1,
    previewType: 'animation-layer-candidate-preview',
    generatedAt: new Date().toISOString(),
    projectSlug: 'blessings-of-sumer',
    chapterNumber: 1,
    episodeNumber: 1,
    sourceShotNumber: 3,
    layerId: LAYER_ID,
    source: {
      path: SOURCE_PATH,
      checksum: await sha256(SOURCE_PATH),
      dimensions: sourceDimensions,
    },
    candidate: {
      runDirectory: candidate.runDirectory,
      path: candidate.path,
      checksum: await sha256(candidate.path),
      dimensions: candidateDimensions,
      generatedAt: candidate.manifest.generatedAt ?? null,
    },
    motion: {
      preset: 'enki-body-identity-preservation-v1',
      strength: options.motionStrength,
      purpose:
        'Expose Enki silhouette/edge quality with restrained whole-figure breathing and inertia while preserving source pixels and identity.',
    },
    renderProfile,
    renderDurationMs,
    output: {
      path: videoPath,
      checksum: await sha256(videoPath),
      width: WIDTH,
      height: HEIGHT,
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
      candidatePromoted: false,
      animationV1Modified: false,
      humanApprovalRequired: true,
      identityPreservationRequired: true,
    },
  });

  console.log('');
  console.log(`Rendered preview: ${videoPath}`);
  console.log(`Render time: ${(renderDurationMs / 1000).toFixed(1)}s`);
  console.log(`Review contact sheet: ${contactSheetPath}`);
  console.log(`Preview manifest: ${manifestPath}`);
  console.log('No animation-v1 asset or manifest was modified.');
}

function parseOptions(args: string[]): CliOptions {
  const options: CliOptions = {
    motionStrength: 1,
    showReviewGuides: false,
  };
  for (const arg of args) {
    if (arg.startsWith('--candidate-dir=')) {
      options.candidateDir = arg.slice('--candidate-dir='.length);
    } else if (arg.startsWith('--motion-strength=')) {
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

async function resolveEnkiCandidate(configuredDirectory?: string): Promise<{
  runDirectory: string;
  path: string;
  manifest: CandidateRunManifest;
}> {
  const runDirectories = configuredDirectory
    ? [resolve(configuredDirectory)]
    : await newestCandidateDirectories();

  for (const runDirectory of runDirectories) {
    assertInside(CANDIDATE_ROOT, runDirectory, 'Candidate run directory');
    let manifest: CandidateRunManifest = {};
    try {
      manifest = JSON.parse(
        await readFile(join(runDirectory, 'candidate-run.json'), 'utf8'),
      ) as CandidateRunManifest;
    } catch {
      continue;
    }

    for (const entry of manifest.candidates ?? []) {
      const layerId =
        typeof entry['layerId'] === 'string'
          ? entry['layerId']
          : isRecord(entry['layer']) && typeof entry['layer']['id'] === 'string'
            ? entry['layer']['id']
            : undefined;
      const rawPath = ['candidatePath', 'path', 'outputPath']
        .map((key) => entry[key])
        .find((value): value is string => typeof value === 'string');
      const lowerPath = rawPath?.toLowerCase() ?? '';
      if (
        layerId !== LAYER_ID &&
        !lowerPath.includes('enki-body') &&
        !lowerPath.includes(LAYER_ID)
      ) {
        continue;
      }
      if (!rawPath) continue;
      const paths = isAbsolute(rawPath)
        ? [resolve(rawPath)]
        : [resolve(rawPath), resolve(runDirectory, rawPath)];
      for (const path of paths) {
        if (isInside(runDirectory, path) && (await fileExists(path))) {
          return { runDirectory, path, manifest };
        }
      }
    }

    const pngs = await collectPngFiles(runDirectory);
    const enki = pngs.filter((path) => {
      const name = basename(path).toLowerCase();
      return name.includes(LAYER_ID) || name.includes('enki-body');
    });
    const selected = enki.length === 1 ? enki[0] : undefined;
    if (selected) return { runDirectory, path: selected, manifest };
  }

  throw new Error(
    `No ${LAYER_ID} PNG found. Run pnpm comfyui:enki:generate first or pass --candidate-dir.`,
  );
}

async function newestCandidateDirectories(): Promise<string[]> {
  try {
    return (await readdir(CANDIDATE_ROOT, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(CANDIDATE_ROOT, entry.name))
      .sort((a, b) => basename(b).localeCompare(basename(a)));
  } catch {
    return [];
  }
}

async function collectPngFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectPngFiles(path)));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) files.push(path);
  }
  return files;
}

function readPngDimensions(buffer: Buffer, label: string): { width: number; height: number } {
  if (
    buffer.length < 24 ||
    buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
    buffer.subarray(12, 16).toString('ascii') !== 'IHDR'
  ) {
    throw new Error(`${label} is not a valid PNG with an IHDR header.`);
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function assertInside(parent: string, child: string, label: string): void {
  if (!isInside(parent, child)) {
    throw new Error(`${label} must remain under ${parent}: ${child}`);
  }
}

function isInside(parent: string, child: string): boolean {
  const path = relative(resolve(parent), resolve(child));
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
