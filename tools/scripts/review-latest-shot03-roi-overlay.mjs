import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { maybeOpenReviewArtifacts } from './open-review-artifacts.mjs';
import { reviewGeneratedMedia } from './review-generated-media.mjs';

const ROOT = resolve('.');
const WORK_ROOT = resolve('tmp/animation-assets/resegmentation/shot03-roi-search');
const SOURCE_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-03.png',
);
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const WIDTH = 941;
const HEIGHT = 1672;
const options = {
  noOpen: process.argv.includes('--no-open'),
  noAiReview: process.argv.includes('--no-ai-review'),
  requireAiReview: process.argv.includes('--require-ai-review'),
};

await main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const runDirectory = await latestRunDirectory();
  const searchPath = join(runDirectory, 'shot03-roi-segmentation-search.json');
  const refinedPath = join(runDirectory, 'shot03-roi-refined-structural-review.json');
  if (!existsSync(searchPath)) throw new Error(`Missing search report: ${searchPath}`);
  if (!existsSync(refinedPath)) {
    throw new Error(
      `Missing refined structural report: ${refinedPath}. Run node tools/scripts/reassess-latest-shot03-roi.mjs first.`,
    );
  }

  const search = JSON.parse(await readFile(searchPath, 'utf8'));
  const refined = JSON.parse(await readFile(refinedPath, 'utf8'));
  const vessel = refined.ranked?.vessel?.[0];
  const enki = refined.ranked?.enki?.[0];
  if (!vessel || !enki) throw new Error('Refined report does not contain both vessel and Enki rankings.');

  const selected = [
    enrichSelection(vessel, search),
    enrichSelection(enki, search),
  ];

  console.log('Shot 3 ROI source-backed overlay review');
  console.log(`Run: ${runDirectory}`);
  console.log('Policy: existing source/candidate files only; no regeneration or canonical mutation.');
  console.log('');

  const overlayPaths = [];
  for (const item of selected) {
    const outputPath = join(runDirectory, `shot03-${item.target}-diagnostic-overlay.png`);
    createOverlay(item, outputPath);
    overlayPaths.push(outputPath);
    console.log(
      `[OVERLAY] ${item.target}: ${outputPath}\n` +
        `          risk=${item.refinedStructuralRisk} · largest ${(item.largestComponentShare * 100).toFixed(2)}% · significant=${item.significantComponentCount} · interior=${formatSides(item.interiorTouchedSides)}`,
    );
  }

  const sheetPath = join(runDirectory, 'shot03-roi-diagnostic-overlay-sheet.png');
  createSheet(overlayPaths, sheetPath);
  console.log(`[REVIEW] diagnostic overlay sheet: ${sheetPath}`);

  let ai = null;
  if (!options.noAiReview) {
    const aiPath = join(runDirectory, 'ollama-roi-overlay-review.json');
    const deterministicEvidence = selected.map((item) => ({
      target: item.target,
      padding: item.padding,
      refinedStructuralRisk: item.refinedStructuralRisk,
      largestComponentShare: item.largestComponentShare,
      significantComponentCount: item.significantComponentCount,
      interiorTouchedSides: item.interiorTouchedSides,
      sourceBoundaryTouchedSides: item.sourceBoundaryTouchedSides,
      largestComponentBbox: item.original?.registeredAnalysis?.largestComponentBbox ?? null,
      topComponents: (item.original?.registeredAnalysis?.topComponents ?? []).slice(0, 6),
    }));

    ai = await reviewGeneratedMedia({
      artifacts: [
        { path: SOURCE_PATH, label: 'approved Shot 3 editorial source' },
        { path: selected[0].registeredPath, label: 'top vessel extracted layer' },
        { path: overlayPaths[0], label: 'vessel diagnostic overlay on editorial source' },
        { path: selected[1].registeredPath, label: 'top Enki extracted layer' },
        { path: overlayPaths[1], label: 'Enki diagnostic overlay on editorial source' },
      ],
      task: [
        'Review the actual extracted layers together with source-backed diagnostic overlays.',
        'The diagnostic overlays show selected alpha over the editorial source, the ROI boundary, connected-component boxes, and any interior ROI edge contact emphasized.',
        `Deterministic evidence: ${JSON.stringify(deterministicEvidence)}`,
        'For vessel, decide whether the interior top-edge contact appears to be legitimate vessel extent, unrelated rigging/scene contamination, or clipping. Do not infer a root cause beyond visible evidence.',
        'For Enki, decide whether the substantial secondary connected components are legitimate disconnected character details or unrelated scene contamination.',
        'Do not override deterministic measurements. State clearly where visual evidence and deterministic structure disagree.',
        'PASS_ADVISORY means only that the pair is suitable for human review; never automatic promotion.',
      ].join(' '),
      rubric: [
        'vessel silhouette completeness and semantic purity',
        'vessel top-edge contact classification',
        'Enki figure completeness and identity preservation',
        'Enki secondary-component contamination assessment',
        'agreement or disagreement with deterministic structural evidence',
      ],
      outputPath: aiPath,
      requireAi: options.requireAiReview,
      maxVideoSamples: 1,
    });
    console.log(`[INFO] overlay AI status: ${ai.status}`);
    console.log(`[INFO] overlay AI report: ${aiPath}`);
  } else {
    console.log('[ai] overlay review skipped by --no-ai-review');
  }

  const receiptPath = join(runDirectory, 'shot03-roi-overlay-review.json');
  const receipt = {
    schemaVersion: 1,
    type: 'shot03-roi-overlay-review',
    generatedAt: new Date().toISOString(),
    sourceSearchReportPath: searchPath,
    sourceRefinedReportPath: refinedPath,
    selected: selected.map(({ original, ...item }) => item),
    artifacts: {
      vesselOverlay: overlayPaths[0],
      enkiOverlay: overlayPaths[1],
      overlaySheet: sheetPath,
    },
    aiStatus: ai?.status ?? null,
    noRegeneration: true,
    canonicalAssetsMutated: false,
    automaticPromotionAllowed: false,
    humanReviewRequired: true,
  };
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log(`[INFO] overlay receipt: ${receiptPath}`);

  await maybeOpenReviewArtifacts(
    [sheetPath, selected[0].registeredPath, selected[1].registeredPath],
    { enabled: !options.noOpen, delayMs: 120 },
  );
}

function enrichSelection(refinedItem, search) {
  const original = (search.results ?? []).find(
    (item) =>
      item.target === refinedItem.target &&
      Number(item.padding) === Number(refinedItem.padding) &&
      Number(item.threshold) === Number(refinedItem.threshold),
  );
  if (!original) {
    throw new Error(`Could not match ${refinedItem.target} refined candidate to original search result.`);
  }
  return {
    ...refinedItem,
    registeredPath: resolve(refinedItem.registeredPath),
    largestComponentShare: Number(refinedItem.largestComponentShare ?? 0),
    significantComponentCount: Number(refinedItem.significantComponentCount ?? 0),
    original,
  };
}

function createOverlay(item, outputPath) {
  if (!existsSync(item.registeredPath)) throw new Error(`Missing candidate: ${item.registeredPath}`);
  const components = (item.original?.registeredAnalysis?.topComponents ?? []).slice(0, 6);
  const filters = [
    `[1:v]alphaextract[mask]`,
    `color=c=red@0.42:s=${WIDTH}x${HEIGHT}:d=1,format=rgba[tintbase]`,
    `[tintbase][mask]alphamerge[tint]`,
    `[0:v][tint]overlay=format=auto[ov]`,
  ];

  let current = 'ov';
  let index = 0;
  const addDraw = (draw) => {
    const next = `d${index++}`;
    filters.push(`[${current}]${draw}[${next}]`);
    current = next;
  };

  const roi = item.roi;
  addDraw(`drawbox=x=${roi.x}:y=${roi.y}:w=${roi.width}:h=${roi.height}:color=cyan@0.95:t=3`);

  components.forEach((component, componentIndex) => {
    const box = component.bbox;
    if (!box) return;
    addDraw(
      `drawbox=x=${box.x}:y=${box.y}:w=${box.width}:h=${box.height}:color=${componentIndex === 0 ? 'yellow' : 'orange'}@0.9:t=${componentIndex === 0 ? 3 : 2}`,
    );
  });

  const thickness = 7;
  for (const side of item.interiorTouchedSides ?? []) {
    if (side === 'top') addDraw(`drawbox=x=${roi.x}:y=${roi.y}:w=${roi.width}:h=${thickness}:color=red@1:t=fill`);
    if (side === 'bottom') addDraw(`drawbox=x=${roi.x}:y=${roi.y + roi.height - thickness}:w=${roi.width}:h=${thickness}:color=red@1:t=fill`);
    if (side === 'left') addDraw(`drawbox=x=${roi.x}:y=${roi.y}:w=${thickness}:h=${roi.height}:color=red@1:t=fill`);
    if (side === 'right') addDraw(`drawbox=x=${roi.x + roi.width - thickness}:y=${roi.y}:w=${thickness}:h=${roi.height}:color=red@1:t=fill`);
  }

  runFfmpeg([
    '-i', SOURCE_PATH,
    '-i', item.registeredPath,
    '-filter_complex', filters.join(';'),
    '-map', `[${current}]`,
    '-frames:v', '1',
    outputPath,
  ]);
}

function createSheet(paths, outputPath) {
  runFfmpeg([
    '-i', paths[0],
    '-i', paths[1],
    '-filter_complex',
    '[0:v]scale=470:836:flags=lanczos[left];[1:v]scale=470:836:flags=lanczos[right];[left][right]hstack=inputs=2[sheet]',
    '-map', '[sheet]',
    '-frames:v', '1',
    outputPath,
  ]);
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
    throw new Error(`FFmpeg failed with exit ${result.status ?? 'unknown'}: ${result.stderr || result.stdout}`);
  }
}

async function latestRunDirectory() {
  const entries = await readdir(WORK_ROOT, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(WORK_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));
  for (const directory of directories) {
    if (existsSync(join(directory, 'shot03-roi-segmentation-search.json'))) return directory;
  }
  throw new Error(`No completed Shot 3 ROI search found under ${WORK_ROOT}.`);
}

function formatSides(sides) {
  return sides?.length ? sides.join(',') : 'none';
}
