import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

const ROOT = resolve('.');
const WORK_ROOT = resolve('tmp/animation-assets/resegmentation/shot03-roi-search');
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const SOURCE_WIDTH = 941;
const SOURCE_HEIGHT = 1672;
const STRONG_ALPHA = 128;

await main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const reportPath = await latestSearchReport();
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  const results = Array.isArray(report.results) ? report.results : [];
  if (!results.length) throw new Error(`No ROI results found in ${reportPath}.`);

  console.log('Shot 3 source-aware ROI structural reassessment');
  console.log(`Search report: ${reportPath}`);
  console.log('Policy: existing candidate files only; no regeneration or canonical mutation.');
  console.log('');

  const reassessed = [];
  for (const item of results) {
    const cropPath = resolve(item.cropCandidatePath);
    if (!existsSync(cropPath)) throw new Error(`Missing ROI candidate: ${cropPath}`);
    const edgeContact = inspectStrongAlphaEdges(cropPath, item.roi.width, item.roi.height);
    const sourceBoundarySides = sourceBoundarySidesForRoi(item.roi);
    const interiorTouchedSides = edgeContact.touchedSides.filter(
      (side) => !sourceBoundarySides.includes(side),
    );
    const sourceBoundaryTouchedSides = edgeContact.touchedSides.filter((side) =>
      sourceBoundarySides.includes(side),
    );

    const largestShare = Number(item.registeredAnalysis?.largestComponentShare ?? 0);
    const significantCount = Number(item.registeredAnalysis?.significantComponentCount ?? 0);
    const risk = structuralRisk({
      largestShare,
      significantCount,
      interiorTouchedSides,
    });
    const score = structuralScore({
      risk,
      largestShare,
      significantCount,
      interiorTouchedSides,
    });

    const next = {
      target: item.target,
      layerId: item.layerId,
      padding: item.padding,
      threshold: item.threshold,
      roi: item.roi,
      cropCandidatePath: cropPath,
      registeredPath: item.registeredPath,
      largestComponentShare: largestShare,
      significantComponentCount: significantCount,
      oldStructuralRisk: item.structuralRisk,
      edgeContact,
      sourceBoundarySides,
      sourceBoundaryTouchedSides,
      interiorTouchedSides,
      refinedStructuralRisk: risk,
      refinedStructuralScore: score,
    };
    reassessed.push(next);

    console.log(
      `[${item.target} pad=${Number(item.padding).toFixed(2)}] ${item.structuralRisk} -> ${risk} · largest ${(largestShare * 100).toFixed(2)}% · significant ${significantCount}`,
    );
    console.log(
      `  touched=${formatSides(edgeContact.touchedSides)} · source-boundary=${formatSides(sourceBoundaryTouchedSides)} · INTERIOR=${formatSides(interiorTouchedSides)}`,
    );
  }

  const ranked = {};
  for (const target of [...new Set(reassessed.map((item) => item.target))]) {
    ranked[target] = reassessed
      .filter((item) => item.target === target)
      .sort((a, b) => a.refinedStructuralScore - b.refinedStructuralScore);
  }

  const survivors = reassessed.filter((item) => item.refinedStructuralRisk !== 'HIGH');
  const bothTargetsSurvive = ['vessel', 'enki'].every((target) =>
    survivors.some((item) => item.target === target),
  );
  const outputPath = join(resolve(reportPath, '..'), 'shot03-roi-refined-structural-review.json');
  const output = {
    schemaVersion: 1,
    type: 'shot03-roi-refined-structural-review',
    generatedAt: new Date().toISOString(),
    sourceSearchReportPath: reportPath,
    sourceDimensions: { width: SOURCE_WIDTH, height: SOURCE_HEIGHT },
    policy: {
      sourceFrameBoundaryContactIsNotClipping: true,
      interiorRoiBoundaryContactIsClippingRisk: true,
      dominantComponentStillRequired: true,
      noRegeneration: true,
      noCanonicalMutation: true,
      automaticPromotionAllowed: false,
    },
    results: reassessed,
    ranked,
    survivorCount: survivors.length,
    bothTargetsSurvive,
  };
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  console.log('');
  console.log('[RANKING]');
  for (const [target, items] of Object.entries(ranked)) {
    console.log(`  ${target}:`);
    for (const item of items) {
      console.log(
        `    pad=${Number(item.padding).toFixed(2)} · ${item.refinedStructuralRisk} · score ${item.refinedStructuralScore.toFixed(2)} · interior ${formatSides(item.interiorTouchedSides)}`,
      );
    }
  }
  console.log('');
  console.log(`[INFO] refined report: ${outputPath}`);
  console.log(`[INFO] refined structural survivors: ${survivors.length}`);
  console.log(`[INFO] both targets survive: ${bothTargetsSurvive ? 'YES' : 'NO'}`);
  if (!bothTargetsSurvive) {
    console.log('[STOP] Semantic vision praise does not override remaining deterministic structural failures.');
  } else {
    console.log('[NEXT] Both targets have source-aware structural survivors; human visual review remains required before promotion.');
  }
}

async function latestSearchReport() {
  const entries = await readdir(WORK_ROOT, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(WORK_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));
  for (const directory of directories) {
    const path = join(directory, 'shot03-roi-segmentation-search.json');
    if (existsSync(path)) return path;
  }
  throw new Error(`No completed ROI search report found under ${WORK_ROOT}.`);
}

function inspectStrongAlphaEdges(path, width, height) {
  const pixels = width * height;
  const decoded = spawnSync(
    FFMPEG,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      path,
      '-frames:v',
      '1',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgba',
      'pipe:1',
    ],
    {
      cwd: ROOT,
      encoding: null,
      maxBuffer: Math.max(32 * 1024 * 1024, pixels * 4 + 1024),
      windowsHide: true,
      shell: false,
    },
  );
  if (decoded.error) throw decoded.error;
  if (decoded.status !== 0) {
    throw new Error(`ffmpeg could not decode ${path}: ${String(decoded.stderr ?? '').trim()}`);
  }
  if (!Buffer.isBuffer(decoded.stdout) || decoded.stdout.length !== pixels * 4) {
    throw new Error(`${path} decoded to ${decoded.stdout?.length ?? 0} bytes; expected ${pixels * 4}.`);
  }

  const counts = { left: 0, right: 0, top: 0, bottom: 0 };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      if (decoded.stdout[pixel * 4 + 3] <= STRONG_ALPHA) continue;
      if (x === 0) counts.left += 1;
      if (x === width - 1) counts.right += 1;
      if (y === 0) counts.top += 1;
      if (y === height - 1) counts.bottom += 1;
    }
  }
  const touchedSides = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([side]) => side);
  return { threshold: STRONG_ALPHA, counts, touchedSides };
}

function sourceBoundarySidesForRoi(roi) {
  const sides = [];
  if (roi.x === 0) sides.push('left');
  if (roi.y === 0) sides.push('top');
  if (roi.x + roi.width === SOURCE_WIDTH) sides.push('right');
  if (roi.y + roi.height === SOURCE_HEIGHT) sides.push('bottom');
  return sides;
}

function structuralRisk({ largestShare, significantCount, interiorTouchedSides }) {
  if (interiorTouchedSides.length) return 'HIGH';
  if (largestShare >= 0.9 && significantCount <= 4) return 'LOW';
  if (largestShare >= 0.75 && significantCount <= 8) return 'MEDIUM';
  return 'HIGH';
}

function structuralScore({ risk, largestShare, significantCount, interiorTouchedSides }) {
  const riskPenalty = { LOW: 0, MEDIUM: 100, HIGH: 200 }[risk] ?? 300;
  return (
    riskPenalty +
    interiorTouchedSides.length * 60 +
    (1 - largestShare) * 50 +
    significantCount * 2
  );
}

function formatSides(sides) {
  return sides?.length ? sides.join(',') : 'none';
}
