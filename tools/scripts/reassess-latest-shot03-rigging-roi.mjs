import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { evaluateRiggingRoiCandidateSourceAware } from '../animation/src/rigging-roi-boundary-policy.mjs';
import { maybeOpenReviewArtifacts } from './open-review-artifacts.mjs';

const ROOT = resolve('.');
const WORK_ROOT = resolve('tmp/animation-assets/resegmentation/shot03-rigging-roi-search');
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const REPORT_NAME = 'shot03-rigging-roi-search.json';
const SOURCE_WIDTH = 941;
const SOURCE_HEIGHT = 1672;

await main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const reportPath = await findLatestReport();
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  const sourcePath = resolve(report.sourcePath);
  if (!existsSync(sourcePath)) throw new Error(`Editorial source is missing: ${sourcePath}`);

  const outputDirectory = join(dirname(reportPath), 'source-aware-review');
  await mkdir(outputDirectory, { recursive: true });

  console.log('Shot 3 rigging ROI source-aware reassessment');
  console.log(`Report: ${reportPath}`);
  console.log(`Source: ${sourcePath}`);
  console.log('Policy: source-frame boundary contact is not ROI clipping; interior ROI contact still hard-fails.');
  console.log('Policy: review-only reassessment; no regeneration, canonical mutation, inpaint, or motion activation.');
  console.log('');

  const reassessed = [];
  for (const result of report.results ?? []) {
    const refined = evaluateRiggingRoiCandidateSourceAware({
      roi: result.roi,
      cropAnalysis: result.cropAnalysis,
      sourceFidelity: result.sourceFidelity,
      sourceWidth: report.sourceDimensions?.width ?? SOURCE_WIDTH,
      sourceHeight: report.sourceDimensions?.height ?? SOURCE_HEIGHT,
    });

    const label = `pad-${Number(result.padding).toFixed(2).replace('.', 'p')}`;
    const registeredPath = resolve(result.registeredPath);
    const overlayPath = join(outputDirectory, `${label}-source-overlay.png`);
    const whitePath = join(outputDirectory, `${label}-white-matte.png`);
    createSourceOverlay(sourcePath, registeredPath, overlayPath);
    createWhiteMatte(registeredPath, whitePath);

    const item = {
      padding: result.padding,
      originalRisk: result.structuralRisk,
      originalPass: result.structuralPass,
      refinedRisk: refined.risk,
      refinedPass: refined.pass,
      boundary: refined.boundary,
      failures: refined.failures,
      advisories: refined.advisories,
      strongAlphaPixels: result.cropAnalysis?.strongAlphaPixels ?? 0,
      cropCoverage: result.cropAnalysis?.strongCoverage ?? 0,
      significantComponents: result.cropAnalysis?.significantComponentCount ?? 0,
      topEightComponentShare: result.cropAnalysis?.topEightComponentShare ?? 0,
      sourceMismatchRatio: result.sourceFidelity?.strongMismatchRatio ?? 1,
      registeredPath,
      overlayPath,
      whiteMattePath: whitePath,
    };
    reassessed.push(item);

    console.log(
      `[${refined.pass ? 'SURVIVOR' : 'REJECT'}] pad=${Number(result.padding).toFixed(2)} · ${result.structuralRisk}->${refined.risk} · touched=${formatSides(refined.boundary.touchedSides)} · source-boundary=${formatSides(refined.boundary.sourceBoundarySides)} · INTERIOR=${formatSides(refined.boundary.interiorTouchedSides)} · strong=${item.strongAlphaPixels} · significant=${item.significantComponents} · top8=${(item.topEightComponentShare * 100).toFixed(2)}% · source-mismatch=${(item.sourceMismatchRatio * 100).toFixed(3)}%`,
    );
    for (const failure of refined.failures) console.log(`  [BLOCKED] ${failure}`);
    for (const advisory of refined.advisories) console.log(`  [ADVISORY] ${advisory}`);
  }

  const ordered = [...reassessed].sort((left, right) => {
    if (left.refinedPass !== right.refinedPass) return left.refinedPass ? -1 : 1;
    if (left.refinedRisk !== right.refinedRisk) return riskRank(left.refinedRisk) - riskRank(right.refinedRisk);
    return right.strongAlphaPixels - left.strongAlphaPixels;
  });

  const overlaySheet = join(outputDirectory, 'shot03-rigging-source-overlay-contact-sheet.png');
  const whiteSheet = join(outputDirectory, 'shot03-rigging-white-matte-contact-sheet.png');
  createContactSheet(ordered.map((item) => item.overlayPath), overlaySheet);
  createContactSheet(ordered.map((item) => item.whiteMattePath), whiteSheet);

  const reassessmentPath = join(outputDirectory, 'shot03-rigging-source-aware-reassessment.json');
  const output = {
    schemaVersion: 1,
    type: 'shot03-rigging-roi-source-aware-reassessment',
    generatedAt: new Date().toISOString(),
    sourceReport: reportPath,
    sourcePath,
    policy: {
      sourceFrameBoundaryContactAllowedAsAdvisory: true,
      interiorRoiContactHardFail: true,
      canonicalMutationAllowed: false,
      backgroundRepairAllowed: false,
      motionActivationAllowed: false,
      humanSemanticReviewRequired: true,
    },
    results: ordered,
    survivors: ordered.filter((item) => item.refinedPass),
    artifacts: { overlayContactSheet: overlaySheet, whiteMatteContactSheet: whiteSheet },
  };
  await writeFile(reassessmentPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  console.log('');
  console.log(`[REVIEW] source-highlight overlays: ${overlaySheet}`);
  console.log(`[REVIEW] transparent cutouts on white: ${whiteSheet}`);
  if (ordered[0]) console.log(`[REVIEW] top reassessed candidate overlay: ${ordered[0].overlayPath}`);
  console.log(`[INFO] reassessment: ${reassessmentPath}`);

  const survivors = ordered.filter((item) => item.refinedPass);
  if (!survivors.length) {
    console.log('[STOP] No source-aware survivor. Do not repair background or animate rigging.');
  } else {
    console.log(`[GATE] ${survivors.length} source-aware survivor(s). Human must verify the highlighted pixels are coherent rigging, avoid Enki face, and contain no sail/hull/body contamination.`);
    console.log('[STOP] This reassessment does not authorize inpaint or motion by itself.');
  }

  await maybeOpenReviewArtifacts(
    [sourcePath, overlaySheet, whiteSheet, ordered[0]?.overlayPath].filter(Boolean),
    { delayMs: 120 },
  );
}

async function findLatestReport() {
  if (!existsSync(WORK_ROOT)) throw new Error(`No rigging ROI search root exists: ${WORK_ROOT}`);
  const entries = await readdir(WORK_ROOT, { withFileTypes: true });
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const path = join(WORK_ROOT, entry.name, REPORT_NAME);
    if (!existsSync(path)) continue;
    const info = await stat(path);
    candidates.push({ path, mtimeMs: info.mtimeMs });
  }
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  if (!candidates.length) throw new Error(`No ${REPORT_NAME} found under ${WORK_ROOT}`);
  return candidates[0].path;
}

function createSourceOverlay(sourcePath, registeredPath, outputPath) {
  runFfmpeg([
    '-i', sourcePath,
    '-i', registeredPath,
    '-filter_complex',
    `[1:v]alphaextract[mask];color=c=red:s=${SOURCE_WIDTH}x${SOURCE_HEIGHT}:d=1,format=rgba[red];[red][mask]alphamerge,colorchannelmixer=aa=0.62[tint];[0:v][tint]overlay=x=0:y=0:format=auto[out]`,
    '-map', '[out]',
    '-frames:v', '1',
    outputPath,
  ]);
}

function createWhiteMatte(registeredPath, outputPath) {
  runFfmpeg([
    '-f', 'lavfi',
    '-i', `color=c=white:s=${SOURCE_WIDTH}x${SOURCE_HEIGHT}:d=1`,
    '-i', registeredPath,
    '-filter_complex', '[0:v]format=rgba[base];[1:v]format=rgba[fg];[base][fg]overlay=x=0:y=0:format=auto[out]',
    '-map', '[out]',
    '-frames:v', '1',
    outputPath,
  ]);
}

function createContactSheet(paths, outputPath) {
  if (!paths.length) return;
  const args = [];
  for (const path of paths.slice(0, 3)) args.push('-i', path);
  const filters = paths.slice(0, 3).map(
    (_path, index) => `[${index}:v]scale=282:502:flags=lanczos[p${index}]`,
  );
  filters.push(
    paths.length >= 3
      ? '[p0][p1][p2]hstack=inputs=3[out]'
      : paths.length === 2
        ? '[p0][p1]hstack=inputs=2[out]'
        : '[p0]null[out]',
  );
  runFfmpeg([...args, '-filter_complex', filters.join(';'), '-map', '[out]', '-frames:v', '1', outputPath]);
}

function runFfmpeg(args) {
  const result = spawnSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`FFmpeg failed (${basename(args.at(-1) ?? '<output>')}): ${result.stderr || result.stdout}`);
  }
}

function riskRank(value) {
  return { LOW: 0, MEDIUM: 1, HIGH: 2 }[value] ?? 3;
}

function formatSides(sides) {
  return sides?.length ? sides.join(',') : 'none';
}
