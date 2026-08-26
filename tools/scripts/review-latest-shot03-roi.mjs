import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { reviewGeneratedMedia } from './review-generated-media.mjs';
import { maybeOpenReviewArtifacts } from './open-review-artifacts.mjs';

const WORK_ROOT = resolve('tmp/animation-assets/resegmentation/shot03-roi-search');
const SOURCE_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-03.png',
);

const options = parseOptions(process.argv.slice(2));

await main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const reportPath = await latestSearchReport();
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  const runDirectory = resolve(reportPath, '..');

  const vessel = report.ranked?.vessel?.[0] ?? null;
  const enki = report.ranked?.enki?.[0] ?? null;
  const contactSheet = report.artifacts?.alphaContactSheet ?? null;

  if (!vessel?.registeredPath) throw new Error('Latest ROI report has no ranked vessel candidate.');
  if (!enki?.registeredPath) throw new Error('Latest ROI report has no ranked Enki candidate.');
  if (!contactSheet) throw new Error('Latest ROI report has no alpha contact sheet.');

  const required = [SOURCE_PATH, contactSheet, vessel.registeredPath, enki.registeredPath];
  for (const path of required) {
    if (!existsSync(path)) throw new Error(`Review evidence not found: ${path}`);
  }

  const deterministicSummary = {
    vessel: summarizeCandidate(vessel),
    enki: summarizeCandidate(enki),
    structuralSurvivors: (report.results ?? []).filter((item) => item.structuralRisk !== 'HIGH').length,
  };

  const outputPath = join(runDirectory, 'ollama-top-candidate-review.json');
  console.log('Shot 3 latest ROI top-candidate review');
  console.log(`Search report: ${reportPath}`);
  console.log(`Vessel: ${vessel.registeredPath}`);
  console.log(`Enki: ${enki.registeredPath}`);
  console.log(`Deterministic survivors: ${deterministicSummary.structuralSurvivors}`);

  const review = await reviewGeneratedMedia({
    artifacts: [
      { path: SOURCE_PATH, label: 'approved Shot 3 editorial source — immutable reference' },
      {
        path: contactSheet,
        label: 'ROI alpha contact sheet — white selected alpha, black transparent',
      },
      {
        path: vessel.registeredPath,
        label: `top-ranked vessel registered PNG — padding ${vessel.padding}`,
      },
      {
        path: enki.registeredPath,
        label: `top-ranked Enki registered PNG — padding ${enki.padding}`,
      },
    ],
    task: [
      'Review the actual top-ranked source-backed ROI extraction candidates, not only the alpha contact sheet.',
      'The first image is the immutable editorial source. The third and fourth images are the actual full-canvas extracted layers with transparency.',
      `Deterministic structural evidence: ${JSON.stringify(deterministicSummary)}`,
      'Deterministic structural QA is authoritative. If a candidate is HIGH risk, touches the crop boundary, or there are zero structural survivors, do not call it ready merely because it looks plausible.',
      'Check whether the vessel PNG contains the complete vessel and excludes Enki, water, sky, shoreline, rigging, and unrelated reeds.',
      'Check whether the Enki PNG contains the complete visible figure and excludes boat, water, sky, rigging, and unrelated scene fragments.',
      'Do not speculate about workflow wiring, nondeterminism, scaling, or root cause unless the deterministic evidence proves it.',
      'PASS_ADVISORY means only visually plausible enough for human review; it never overrides deterministic rejection and never authorizes promotion.',
    ].join(' '),
    rubric: [
      'actual candidate content matches the intended semantic target',
      'complete target silhouette without clipping',
      'minimal unrelated scene contamination',
      'no obvious full-frame or ROI-edge artifacts',
      'visual assessment agrees with deterministic structural evidence',
    ],
    outputPath,
    requireAi: options.requireAiReview,
    maxVideoSamples: 1,
  });

  const deterministicPass =
    deterministicSummary.structuralSurvivors > 0 &&
    vessel.structuralRisk !== 'HIGH' &&
    enki.structuralRisk !== 'HIGH';

  console.log('');
  console.log(`[INFO] Ollama review: ${outputPath}`);
  console.log(`[INFO] Ollama status: ${review.status}`);
  console.log(`[INFO] deterministic top-pair pass: ${deterministicPass ? 'YES' : 'NO'}`);
  if (!deterministicPass && review.status === 'PASS_ADVISORY') {
    console.log('[WARN] Ollama visual PASS conflicts with deterministic rejection; deterministic QA wins.');
  }

  if (options.open) {
    await maybeOpenReviewArtifacts(
      [contactSheet, vessel.registeredPath, enki.registeredPath],
      { enabled: true, delayMs: 120 },
    );
  }
}

async function latestSearchReport() {
  let entries;
  try {
    entries = await readdir(WORK_ROOT, { withFileTypes: true });
  } catch {
    throw new Error(`No Shot 3 ROI runs found under ${WORK_ROOT}.`);
  }

  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(WORK_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));

  for (const directory of directories) {
    const path = join(directory, 'shot03-roi-segmentation-search.json');
    if (existsSync(path)) return path;
  }
  throw new Error('No completed Shot 3 ROI segmentation search report was found.');
}

function summarizeCandidate(item) {
  return {
    padding: item.padding,
    threshold: item.threshold,
    structuralRisk: item.structuralRisk,
    structuralScore: item.structuralScore,
    cropEdgeTouch: item.cropAnalysis?.anyStrongTouchesEdge ?? null,
    largestComponentShare: item.registeredAnalysis?.largestComponentShare ?? null,
    significantComponentCount: item.registeredAnalysis?.significantComponentCount ?? null,
    largestComponentBbox: item.registeredAnalysis?.largestComponentBbox ?? null,
    largestTouchesFrameEdge: item.registeredAnalysis?.largestTouchesEdge ?? null,
  };
}

function parseOptions(args) {
  return {
    requireAiReview: args.includes('--require-ai-review'),
    open: args.includes('--open'),
  };
}
