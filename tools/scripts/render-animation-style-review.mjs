import 'dotenv/config';
import { mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { sha256, writeJson, writeText } from '../renderer/artifact-utils.mjs';
import { probeDurationSeconds } from '../renderer/ffmpeg-adapter.mjs';
import { runProcess } from '../renderer/process-runner.mjs';
import { loadRendererConfig } from '../renderer/renderer-config.mjs';

const config = loadRendererConfig();
const options = parseArgs(process.argv.slice(2));
const compositionId = options.composition ?? 'CinematicStyleTest';
const scenePath =
  options.scene ?? 'tools/animation/scenes/cinematic-style-test.scene.json';
const outputPrefix = options.prefix ?? 'cinematic-style-test';
const reviewType = options.reviewType ?? 'cinematic-animation-style-test';
const reportTitle = options.title ?? 'Cinematic Animation Style Review';
const frameTimes = parseFrameTimes(options.frames ?? '2,6,10');
const outputDirectory = resolve(
  process.env.ANIMATION_STYLE_REVIEW_OUTPUT_DIRECTORY ??
    options.outputDirectory ??
    'tmp/renders/animation-style-review',
);
const renderDirectory = join(outputDirectory, 'render');
const framesDirectory = join(outputDirectory, 'frames');
const videoPath = join(renderDirectory, `${outputPrefix}.mp4`);
const sourceManifestName = `${outputPrefix}-manifest.json`;
const sourceManifestPath = join(renderDirectory, sourceManifestName);
const contactSheetPath = join(
  outputDirectory,
  `${outputPrefix}-contact-sheet.png`,
);
const reviewManifestPath = join(outputDirectory, 'style-review-manifest.json');
const reviewReportPath = join(outputDirectory, 'style-review-report.md');

await mkdir(renderDirectory, { recursive: true });
await mkdir(framesDirectory, { recursive: true });

await runProcess(
  process.execPath,
  [
    resolve('tools/scripts/render-animation-proof.mjs'),
    '--scene',
    scenePath,
    '--composition',
    compositionId,
    '--prefix',
    outputPrefix,
    '--manifest',
    sourceManifestName,
  ],
  {
    cwd: resolve('.'),
    timeoutMs: config.jobTimeoutMs,
    env: {
      ANIMATION_PROOF_OUTPUT_DIRECTORY: renderDirectory,
    },
    onStdout: (message) => process.stdout.write(message),
    onStderr: (message) => process.stderr.write(message),
  },
);

const frames = [];
for (const seconds of frameTimes) {
  const framePath = join(
    framesDirectory,
    `${outputPrefix}-${String(seconds).padStart(2, '0')}s.png`,
  );
  await runProcess(
    config.ffmpegCommand,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-ss',
      formatSeek(seconds),
      '-i',
      videoPath,
      '-vf',
      'scale=in_range=pc:out_range=pc',
      '-frames:v',
      '1',
      '-update',
      '1',
      framePath,
    ],
    {
      cwd: resolve('.'),
      timeoutMs: config.processTimeoutMs,
      onStderr: (message) => process.stderr.write(message),
    },
  );
  frames.push({
    seconds,
    path: framePath,
    checksum: await sha256(framePath),
  });
}

await runProcess(
  config.ffmpegCommand,
  [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    ...frames.flatMap((frame) => ['-i', frame.path]),
    '-filter_complex',
    `${frames
      .map((_frame, index) => `[${index}:v]scale=540:-1[s${index}]`)
      .join(';')};${frames
      .map((_frame, index) => `[s${index}]`)
      .join('')}hstack=inputs=${frames.length}[sheet]`,
    '-map',
    '[sheet]',
    '-frames:v',
    '1',
    '-update',
    '1',
    contactSheetPath,
  ],
  {
    cwd: resolve('.'),
    timeoutMs: config.processTimeoutMs,
    onStderr: (message) => process.stderr.write(message),
  },
);

const durationSeconds = await probeDurationSeconds({
  command: config.ffprobeCommand,
  inputPath: videoPath,
  outputDirectory,
  timeoutMs: config.processTimeoutMs,
  log: async (_stream, _level, message) => {
    const normalized = String(message).trim();
    if (normalized) {
      console.log(normalized);
    }
  },
});
const sourceManifest = JSON.parse(await readFile(sourceManifestPath, 'utf8'));
const videoChecksum = await sha256(videoPath);
const sourceManifestChecksum = await sha256(sourceManifestPath);
const contactSheetChecksum = await sha256(contactSheetPath);

await writeJson(reviewManifestPath, {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  reviewType,
  sourceVideo: {
    path: videoPath,
    checksum: videoChecksum,
    durationSeconds,
  },
  sourceManifest: {
    path: sourceManifestPath,
    checksum: sourceManifestChecksum,
    sceneId: sourceManifest.scene?.sceneId,
    styleTarget: sourceManifest.scene?.styleTarget,
  },
  frames,
  contactSheet: {
    path: contactSheetPath,
    checksum: contactSheetChecksum,
  },
  report: {
    path: reviewReportPath,
  },
  reviewNotes: [
    'Judge art direction separately from renderer integration.',
    'Look for cinematic illustrated language, layered depth, atmosphere, and restrained camera motion.',
    'Do not edit source or story text as part of style review.',
  ],
});

await writeText(
  reviewReportPath,
  renderReviewReport({
    generatedAt: new Date().toISOString(),
    videoPath,
    videoChecksum,
    durationSeconds,
    sourceManifestPath,
    sourceManifestChecksum,
    sourceManifest,
    frames,
    contactSheetPath,
    contactSheetChecksum,
    reviewManifestPath,
    reportTitle,
  }),
);

console.log(`Rendered style review video: ${videoPath}`);
console.log(`Wrote contact sheet: ${contactSheetPath}`);
console.log(`Wrote review manifest: ${reviewManifestPath}`);
console.log(`Wrote review report: ${reviewReportPath}`);

function formatSeek(seconds) {
  return `00:00:${String(seconds).padStart(2, '0')}`;
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) {
      continue;
    }
    const [rawKey, inlineValue] = arg.slice(2).split('=', 2);
    const value = inlineValue ?? args[index + 1];
    if (inlineValue === undefined) {
      index += 1;
    }
    parsed[rawKey] = value;
  }
  return parsed;
}

function parseFrameTimes(value) {
  return String(value)
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part) && part >= 0);
}

function renderReviewReport({
  generatedAt,
  videoPath,
  videoChecksum,
  durationSeconds,
  sourceManifestPath,
  sourceManifestChecksum,
  sourceManifest,
  frames,
  contactSheetPath,
  contactSheetChecksum,
  reviewManifestPath,
  reportTitle,
}) {
  return `# ${reportTitle}

Generated: ${generatedAt}

## Purpose

This report is for art-direction review of the short cinematic illustrated animation test. Judge the look, motion language, and readability separately from story/source text. No source or story text is changed by this review artifact.

## Primary Outputs

- Video: ${videoPath}
- Contact sheet: ${contactSheetPath}
- Review manifest: ${reviewManifestPath}
- Source manifest: ${sourceManifestPath}

## Checksums

- Video: \`${videoChecksum}\`
- Contact sheet: \`${contactSheetChecksum}\`
- Source manifest: \`${sourceManifestChecksum}\`

## Scene

- Scene id: \`${sourceManifest.scene?.sceneId ?? 'unknown'}\`
- Style target: \`${sourceManifest.scene?.styleTarget ?? 'unknown'}\`
- Duration: ${durationSeconds.toFixed(2)} seconds

## Contact Sheet

![Cinematic animation contact sheet](./${outputPrefix}-contact-sheet.png)

## Sampled Frames

${frames
  .map(
    (frame) =>
      `- ${frame.seconds}s: ${frame.path}\n  - Checksum: \`${frame.checksum}\``,
  )
  .join('\n')}

## Review Criteria

- Does the look read as cinematic illustrated rather than flat cartoon?
- Does the camera move feel restrained and intentional?
- Do foreground reeds, dust, water planes, and light create useful depth?
- Do character animation channels remain readable behind foreground occlusion?
- Are captions readable inside the vertical safe area?
- Are there any animation channels that distract from the intended mythic tone?

## Decision Notes

- Status:
- Reviewer:
- Required changes:
`;
}
