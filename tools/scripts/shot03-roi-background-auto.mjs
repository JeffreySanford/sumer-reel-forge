import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { maybeOpenReviewArtifacts } from './open-review-artifacts.mjs';
import { reviewGeneratedMedia } from './review-generated-media.mjs';

const ROOT = resolve('.');
const ROI_ROOT = resolve('tmp/animation-assets/resegmentation/shot03-roi-search');
const CANDIDATE_ROOT = resolve(
  'tmp/animation-assets/candidates/chapter-01-reel-01-animation-v1',
);
const DECOMPOSITION_SCRIPT = resolve('tools/scripts/verify-shot03-roi-decomposition.mjs');
const BACKGROUND_SCRIPT = resolve('tools/scripts/shot03-background-layer.mjs');
const BACKGROUND_VERIFY_SCRIPT = resolve('tools/scripts/verify-shot03-background-candidate.mjs');
const SOURCE_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-03.png',
);

const options = parseOptions(process.argv.slice(2));

await main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  console.log('Shot 3 ROI -> background recovery autopilot');
  console.log('Policy: candidate generation and QA only; no canonical mutation, promotion, or motion activation.');
  console.log('');

  const roiReportPath = await latestRoiReport();
  const roiReport = JSON.parse(await readFile(roiReportPath, 'utf8'));
  const vessel = roiReport.ranked?.vessel?.[0];
  const enki = roiReport.ranked?.enki?.[0];
  if (!vessel?.registeredPath || !enki?.registeredPath) {
    throw new Error('Latest ROI report does not contain top vessel and Enki candidates.');
  }
  const vesselPath = resolve(vessel.registeredPath);
  const enkiPath = resolve(enki.registeredPath);
  for (const path of [SOURCE_PATH, vesselPath, enkiPath]) {
    if (!existsSync(path)) throw new Error(`Required input is missing: ${path}`);
  }

  console.log(`[ROI] report: ${roiReportPath}`);
  console.log(`[ROI] vessel: ${vesselPath}`);
  console.log(`[ROI] Enki: ${enkiPath}`);

  console.log('');
  console.log('[1/5] Static decomposition fidelity gate...');
  const decompositionArgs = ['--no-open'];
  if (options.noAiReview) decompositionArgs.push('--no-ai-review');
  if (options.requireAiReview) decompositionArgs.push('--require-ai-review');
  runNode(DECOMPOSITION_SCRIPT, decompositionArgs);

  const decompositionReceiptPath = join(resolve(roiReportPath, '..'), 'decomposition-proof', 'shot03-decomposition-proof.json');
  if (!existsSync(decompositionReceiptPath)) {
    throw new Error(`Decomposition receipt was not produced: ${decompositionReceiptPath}`);
  }
  const decomposition = JSON.parse(await readFile(decompositionReceiptPath, 'utf8'));
  if (decomposition.technicalSourceFidelityPass !== true) {
    console.log('[STOP] deterministic decomposition source-fidelity gate failed; background generation is blocked.');
    process.exitCode = 2;
    return;
  }
  if (decomposition.ai?.status && decomposition.ai.status !== 'PASS_ADVISORY') {
    console.log(`[STOP] decomposition AI review is ${decomposition.ai.status}; background generation is blocked.`);
    process.exitCode = 2;
    return;
  }
  console.log('[PASS] decomposition source-fidelity gate is credible enough to generate a temporary background candidate.');

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const bridgeDirectory = join(CANDIDATE_ROOT, `${stamp}-shot03-roi-bridge`);
  const bridgeShotDirectory = join(bridgeDirectory, 'shot-03');
  const backgroundOutput = join(CANDIDATE_ROOT, `${stamp}-shot03-roi-background`);
  await mkdir(bridgeShotDirectory, { recursive: true });
  await Promise.all([
    copyFile(vesselPath, join(bridgeShotDirectory, 'shot03-vessel-v1.png')),
    copyFile(enkiPath, join(bridgeShotDirectory, 'shot03-enki-body-v1.png')),
  ]);
  const bridgeReceiptPath = join(bridgeDirectory, 'roi-bridge.json');
  await writeFile(
    bridgeReceiptPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        type: 'shot03-roi-background-input-bridge',
        generatedAt: new Date().toISOString(),
        sourceRoiReportPath: roiReportPath,
        sourceDecompositionReceiptPath: decompositionReceiptPath,
        vesselSourcePath: vesselPath,
        enkiSourcePath: enkiPath,
        stagedVesselPath: join(bridgeShotDirectory, 'shot03-vessel-v1.png'),
        stagedEnkiPath: join(bridgeShotDirectory, 'shot03-enki-body-v1.png'),
        canonicalAssetsMutated: false,
        canonicalManifestMutated: false,
        automaticPromotionAllowed: false,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  console.log('');
  console.log('[2/5] Background inpaint preflight...');
  const commonBackgroundArgs = [
    `--enki-candidate-dir=${bridgeDirectory}`,
    `--vessel-candidate-dir=${bridgeDirectory}`,
    `--output=${backgroundOutput}`,
  ];
  if (options.padding !== undefined) commonBackgroundArgs.push(`--padding=${options.padding}`);
  if (options.seed !== undefined) commonBackgroundArgs.push(`--seed=${options.seed}`);
  runNode(BACKGROUND_SCRIPT, ['preflight', ...commonBackgroundArgs]);

  console.log('');
  console.log('[3/5] Generate temporary clean background...');
  runNode(BACKGROUND_SCRIPT, ['generate', ...commonBackgroundArgs]);

  console.log('');
  console.log('[4/5] Deterministic background preservation QA...');
  runNode(BACKGROUND_VERIFY_SCRIPT, [`--candidate-dir=${backgroundOutput}`]);

  const qaPath = join(backgroundOutput, 'background-qa.json');
  const metadataPath = join(backgroundOutput, 'shot-03', 'shot03-background-v1.candidate.json');
  if (!existsSync(qaPath) || !existsSync(metadataPath)) {
    throw new Error('Background generation completed without expected QA/metadata receipts.');
  }
  const qa = JSON.parse(await readFile(qaPath, 'utf8'));
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
  if (qa.pass !== true) {
    console.log('[STOP] background preservation QA failed; no visual acceptance package will be treated as passing.');
    process.exitCode = 2;
    return;
  }

  const candidatePath = resolve(metadata.candidatePath);
  const contactSheetPath = resolve(qa.contactSheetPath);
  const maskPath = resolve(metadata.backgroundInputs?.maskPath ?? qa.maskPath);
  for (const path of [candidatePath, contactSheetPath, maskPath]) {
    if (!existsSync(path)) throw new Error(`Expected background review artifact is missing: ${path}`);
  }

  console.log('');
  console.log('[5/5] Local vision review of background candidate...');
  let ai = null;
  const aiPath = join(backgroundOutput, 'ollama-background-review.json');
  if (!options.noAiReview) {
    ai = await reviewGeneratedMedia({
      artifacts: [
        { path: SOURCE_PATH, label: 'approved Shot 3 editorial source' },
        { path: maskPath, label: 'combined vessel plus Enki removal mask' },
        { path: candidatePath, label: 'temporary clean background candidate after masked inpainting' },
        { path: contactSheetPath, label: 'background QA contact sheet: source, removal mask, repaired background' },
        { path: vesselPath, label: 'source-backed vessel extraction that will later be recomposed' },
        { path: enkiPath, label: 'source-backed Enki extraction that will later be recomposed' },
      ],
      task: [
        'Review this as a temporary clean-background reconstruction for Shot 3.',
        'The source frame is authoritative.',
        'The background candidate should remove vessel and Enki only inside their validated union mask and plausibly reconstruct what lies behind them.',
        `Deterministic background QA passed: ${JSON.stringify(qa.metrics)}.`,
        'Outside-mask preservation is authoritative and must not be contradicted.',
        'Judge visible inpaint seams, duplicated subject remnants, invented objects, implausible water/sky/shore continuation, or obvious repair texture.',
        'PASS_ADVISORY means only suitable for human visual review. Do not promote or activate motion.',
      ].join(' '),
      rubric: [
        'vessel and Enki are removed from the background plate',
        'no obvious subject remnants or duplicate silhouettes',
        'repair blends into adjacent editorial painting',
        'no invented narrative objects or structures',
        'outside-mask source pixels remain visually intact',
      ],
      outputPath: aiPath,
      requireAi: options.requireAiReview,
      maxVideoSamples: 1,
    });
  } else {
    console.log('[ai] background visual review skipped by --no-ai-review');
  }

  const receiptPath = join(backgroundOutput, 'shot03-roi-background-auto.json');
  const receipt = {
    schemaVersion: 1,
    type: 'shot03-roi-background-recovery-autopilot',
    generatedAt: new Date().toISOString(),
    sourceRoiReportPath: roiReportPath,
    sourceDecompositionReceiptPath: decompositionReceiptPath,
    bridgeDirectory,
    bridgeReceiptPath,
    backgroundOutput,
    backgroundCandidatePath: candidatePath,
    backgroundQaPath: qaPath,
    backgroundQaPass: qa.pass === true,
    backgroundAiReviewPath: options.noAiReview ? null : aiPath,
    backgroundAiStatus: ai?.status ?? null,
    canonicalAssetsMutated: false,
    canonicalManifestMutated: false,
    automaticPromotionAllowed: false,
    motionActivationAllowed: false,
    humanReviewRequired: true,
  };
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');

  console.log('');
  console.log(`[PASS] deterministic background QA: ${qa.pass ? 'PASS' : 'FAIL'}`);
  if (ai?.status) console.log(`[INFO] local vision status: ${ai.status}`);
  console.log(`[REVIEW] background candidate: ${candidatePath}`);
  console.log(`[REVIEW] background contact sheet: ${contactSheetPath}`);
  console.log(`[INFO] autopilot receipt: ${receiptPath}`);
  console.log('[STOP] Human visual acceptance of the repaired background is required before static full-layer recomposition and motion.');

  await maybeOpenReviewArtifacts([contactSheetPath, candidatePath], {
    enabled: !options.noOpen,
    delayMs: 120,
  });
}

async function latestRoiReport() {
  const entries = await readdir(ROI_ROOT, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(ROI_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));
  for (const directory of directories) {
    const path = join(directory, 'shot03-roi-segmentation-search.json');
    if (existsSync(path)) return path;
  }
  throw new Error(`No completed Shot 3 ROI report found under ${ROI_ROOT}.`);
}

function runNode(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${basename(script)} failed with exit ${result.status}.`);
  }
}

function parseOptions(args) {
  const result = {
    noOpen: false,
    noAiReview: false,
    requireAiReview: false,
    seed: undefined,
    padding: undefined,
  };
  for (const arg of args) {
    if (arg === '--no-open') result.noOpen = true;
    else if (arg === '--no-ai-review') result.noAiReview = true;
    else if (arg === '--require-ai-review') result.requireAiReview = true;
    else if (arg.startsWith('--seed=')) {
      const value = Number(arg.slice('--seed='.length));
      if (!Number.isSafeInteger(value) || value < 0) throw new Error('--seed must be a non-negative safe integer.');
      result.seed = value;
    } else if (arg.startsWith('--padding=')) {
      const value = Number(arg.slice('--padding='.length));
      if (!Number.isInteger(value) || value < 0 || value > 256) throw new Error('--padding must be an integer between 0 and 256.');
      result.padding = value;
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  return result;
}
