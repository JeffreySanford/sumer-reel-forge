import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { newestCompletePreviewDirectory } from './verify-material-local-motion.mjs';

const MANIFEST_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const PREVIEW_BASE = resolve('tmp/animation-previews');
const AUDIT_ROOT = resolve('tmp/animation-audits');

const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const requestedShots = options.shots.length
  ? options.shots
  : (manifest.shots ?? [])
      .filter((shot) => options.includeDraft || shot.status === 'approved')
      .map((shot) => shot.sourceShotNumber);

if (!requestedShots.length) {
  throw new Error('No animation manifest shots matched the audit selection.');
}

console.log('Reel animation retrospective audit');
console.log('Policy: read-only review. Existing human approvals are never downgraded or mutated.');
console.log(`Shots: ${requestedShots.join(', ')}`);
console.log('');

const results = [];
for (const shotNumber of requestedShots) {
  const manifestShot = manifest.shots?.find(
    (shot) => shot.sourceShotNumber === shotNumber,
  );
  if (!manifestShot) {
    console.log(`[skip] Shot ${shotNumber}: not present in animation-v1 manifest.`);
    results.push({
      sourceShotNumber: shotNumber,
      status: 'SKIPPED_NOT_IN_MANIFEST',
      priorApprovalPreserved: true,
    });
    continue;
  }

  console.log(`=== Shot ${shotNumber} · ${manifestShot.shotId} ===`);
  const args = [
    resolve('tools/scripts/review-animation-shot-runtime.mjs'),
    `--shot=${shotNumber}`,
    '--skip-render',
  ];
  if (options.requireAi) args.push('--require-ai');

  const exitCode = await runNode(args);
  let review = null;
  let previewDirectory = null;
  try {
    const previewRoot = resolve(
      PREVIEW_BASE,
      `shot${String(shotNumber).padStart(2, '0')}-layered-preview`,
    );
    previewDirectory = newestCompletePreviewDirectory(previewRoot, shotNumber);
    const reviewPath = join(previewDirectory, 'shot-review.json');
    if (existsSync(reviewPath)) {
      review = JSON.parse(readFileSync(reviewPath, 'utf8'));
    }
  } catch (error) {
    results.push({
      sourceShotNumber: shotNumber,
      shotId: manifestShot.shotId,
      priorManifestStatus: manifestShot.status,
      status: 'SKIPPED_NO_MODERN_PREVIEW',
      exitCode,
      reason: errorMessage(error),
      priorApprovalPreserved: true,
    });
    console.log(`[review] Shot ${shotNumber}: no compatible modern preview evidence.`);
    console.log('');
    continue;
  }

  results.push({
    sourceShotNumber: shotNumber,
    shotId: manifestShot.shotId,
    priorManifestStatus: manifestShot.status,
    exitCode,
    previewDirectory,
    auditFinalState: review?.finalState ?? 'UNKNOWN',
    deterministicPass: review?.deterministic?.pass ?? null,
    aiStatus: review?.ai?.status ?? null,
    aiRawStatus: review?.ai?.rawStatus ?? null,
    priorApprovalPreserved: true,
  });
  console.log(
    `[audit] Shot ${shotNumber}: ${review?.finalState ?? 'UNKNOWN'} · deterministic ${review?.deterministic?.pass === true ? 'PASS' : 'REVIEW'} · AI ${review?.ai?.status ?? 'unknown'}`,
  );
  console.log('');
}

mkdirSync(AUDIT_ROOT, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportPath = join(AUDIT_ROOT, `reel-01-retrospective-${stamp}.json`);
const report = {
  schemaVersion: 1,
  type: 'animation-reel-retrospective-audit',
  generatedAt: new Date().toISOString(),
  manifestPath: MANIFEST_PATH,
  readOnly: true,
  policy: {
    priorHumanApprovalPreserved: true,
    automaticPromotionAllowed: false,
    manifestMutationAllowed: false,
    regenerationAllowed: false,
  },
  results,
};
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log('Audit summary');
for (const result of results) {
  console.log(
    `  Shot ${result.sourceShotNumber}: ${result.auditFinalState ?? result.status} · prior approval preserved`,
  );
}
console.log(`Report: ${reportPath}`);

if (
  results.some(
    (result) =>
      result.exitCode === 1 ||
      result.auditFinalState === 'DETERMINISTIC_FAIL',
  )
) {
  process.exitCode = 2;
}

async function runNode(args) {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, args, {
      cwd: resolve('.'),
      env: process.env,
      stdio: 'inherit',
      windowsHide: true,
    });
    child.once('error', rejectPromise);
    child.once('exit', (code, signal) => {
      if (signal) {
        console.error(`[audit] Child review exited with signal ${signal}.`);
        resolvePromise(1);
        return;
      }
      resolvePromise(code ?? 1);
    });
  });
}

function parseOptions(args) {
  const result = {
    shots: [],
    includeDraft: false,
    requireAi: true,
  };
  for (const arg of args) {
    if (arg.startsWith('--shots=')) {
      result.shots = arg
        .slice('--shots='.length)
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isInteger(value) && value > 0);
    } else if (arg === '--include-draft') {
      result.includeDraft = true;
    } else if (arg === '--no-require-ai') {
      result.requireAi = false;
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  return result;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
