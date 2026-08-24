import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { newestCompletePreviewDirectory } from './verify-material-local-motion.mjs';
import { reconcileAiWithDeterministicEvidence } from './reconcile-animation-review.mjs';
import { reconcileFindingWithMotionState } from './animation-review-motion-state.mjs';

const PREVIEW_BASE = resolve('tmp/animation-previews');

export function reconcileAiWithMotionState(ai) {
  if (!ai || ai.status === 'SKIPPED') {
    return {
      ai,
      reconciledIndexes: [],
    };
  }
  const motionStates = ai.motionStateEvidence ?? [];
  const reconciledIndexes = [];
  const findings = (ai.findings ?? []).map((finding, index) => {
    const reconciled = reconcileFindingWithMotionState(finding, motionStates);
    if (!reconciled) return finding;
    reconciledIndexes.push(index);
    return reconciled;
  });
  const blockingFindings = findings.filter(
    (finding) =>
      ['medium', 'high'].includes(finding.severity) &&
      finding.origin !== 'source-baseline',
  );
  const sourceBaselineFindings = findings.filter(
    (finding) => finding.origin === 'source-baseline',
  );
  return {
    ai: {
      ...ai,
      status: blockingFindings.length ? ai.status : 'PASS_ADVISORY',
      findings,
      deltaPolicy: {
        ...(ai.deltaPolicy ?? {}),
        blockingFindingCount: blockingFindings.length,
        sourceBaselineFindingCount: sourceBaselineFindings.length,
        blockingFindingIndexes: blockingFindings.map((finding) => findings.indexOf(finding)),
        sourceBaselineFindingIndexes: sourceBaselineFindings.map((finding) =>
          findings.indexOf(finding),
        ),
        motionStateReconciledFindingIndexes: reconciledIndexes,
        rule:
          'Medium/high animation-introduced or uncertain findings block readiness unless directly contradicted by deterministic geometry or runtime material-motion state. Contradicted claims remain low perceptual advisories rather than being erased.',
      },
    },
    reconciledIndexes,
  };
}

async function main() {
  const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
  const shotLabel = String(options.shotNumber).padStart(2, '0');
  const previewRoot = resolve(PREVIEW_BASE, `shot${shotLabel}-layered-preview`);
  const previewDirectory = options.previewDir
    ? resolve(options.previewDir)
    : newestCompletePreviewDirectory(previewRoot, options.shotNumber);
  const reviewPath = join(previewDirectory, 'shot-review.json');
  const containmentPath = join(
    previewDirectory,
    'contained-material-boundary-qa.json',
  );
  if (!existsSync(reviewPath)) {
    throw new Error(`Shot review report not found: ${reviewPath}`);
  }

  const review = JSON.parse(readFileSync(reviewPath, 'utf8'));
  const containmentQa = existsSync(containmentPath)
    ? JSON.parse(readFileSync(containmentPath, 'utf8'))
    : null;

  const geometry = reconcileAiWithDeterministicEvidence({
    ai: review.ai,
    containmentQa,
  });
  const motion = reconcileAiWithMotionState(geometry.ai);
  const ai = motion.ai;

  const containmentPass = containmentQa ? containmentQa.pass === true : true;
  const deterministicPass =
    review.deterministic?.pass === true && containmentPass;
  const aiUnavailable = !ai || ai.status === 'SKIPPED';
  const aiBlocking = ai
    ? ['REVIEW_REQUIRED', 'FAIL_ADVISORY'].includes(ai.status)
    : false;
  const finalState = !deterministicPass
    ? 'DETERMINISTIC_FAIL'
    : aiBlocking || (options.requireAi && aiUnavailable)
      ? 'REVIEW_REQUIRED'
      : 'READY_FOR_HUMAN_REVIEW';

  const reconciliation = {
    applied:
      (geometry.reconciliation?.reconciledFindingCount ?? 0) > 0 ||
      motion.reconciledIndexes.length > 0,
    geometry: geometry.reconciliation,
    motionState: {
      reconciledFindingCount: motion.reconciledIndexes.length,
      reconciledFindingIndexes: motion.reconciledIndexes,
    },
    remainingBlockingFindingCount: ai?.deltaPolicy?.blockingFindingCount ?? 0,
    rule:
      'Deterministic geometry and runtime material-state facts can dispute literal AI claims. Perceptual concerns that are not directly disproved remain blocking when medium/high.',
  };

  review.schemaVersion = Math.max(Number(review.schemaVersion ?? 1), 6);
  review.ai = ai;
  review.deterministicAiReconciliation = reconciliation;
  review.finalState = finalState;
  review.deterministic = review.deterministic ?? {};
  review.deterministic.containedMaterialBoundary = containmentQa
    ? {
        pass: containmentQa.pass === true,
        applicable: containmentQa.applicable !== false,
        reportPath: containmentPath,
      }
    : {
        pass: true,
        applicable: false,
        reportPath: null,
      };
  review.deterministic.pass = deterministicPass;
  writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`, 'utf8');

  const reconciliationPath = join(
    previewDirectory,
    'deterministic-ai-reconciliation-evidence.json',
  );
  writeFileSync(
    reconciliationPath,
    `${JSON.stringify(
      {
        schemaVersion: 2,
        type: 'deterministic-ai-review-reconciliation',
        generatedAt: new Date().toISOString(),
        sourceShotNumber: options.shotNumber,
        previewDirectory,
        finalState,
        reconciliation,
        ai,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  console.log('Deterministic-evidence reconciliation');
  for (const index of geometry.reconciliation?.reconciledFindingIndexes ?? []) {
    const finding = ai?.findings?.[index];
    const evidence = finding?.deterministicReconciliation;
    if (evidence?.gate === 'camera-matched-contained-material-boundary') {
      console.log(
        `[reconciled geometry] finding ${index + 1}: literal containment claim disputed by zero-spill pixel evidence.`,
      );
    }
  }
  for (const index of motion.reconciledIndexes) {
    const finding = ai?.findings?.[index];
    const evidence = finding?.deterministicReconciliation;
    console.log(
      `[reconciled motion] finding ${index + 1}: frame ${evidence?.frame} broadRippleWeight=${Number(evidence?.broadRippleWeight ?? 0).toFixed(3)}, refractionWeight=${Number(evidence?.refractionWeight ?? 0).toFixed(3)}; retained as LOW perceptual texture advisory.`,
    );
  }
  if (!reconciliation.applied) {
    console.log('[ok] no AI finding was directly contradicted by deterministic evidence.');
  }

  if (ai?.status === 'SKIPPED') {
    console.log(`[skip] effective AI review unavailable: ${ai.reason ?? 'unknown reason'}`);
  } else if (ai) {
    console.log(
      `[ai] effective ${ai.status}${ai.rawStatus ? ` · raw ${ai.rawStatus}` : ''} · remaining blocking findings ${ai.deltaPolicy?.blockingFindingCount ?? 0}`,
    );
  }
  console.log(`Reconciliation report: ${reconciliationPath}`);
  console.log('');
  console.log(`FINAL STATE: ${finalState.replaceAll('_', ' ')}`);
  console.log(`Report: ${reviewPath}`);
  console.log('No candidate was promoted and no human approval was recorded.');

  if (!deterministicPass) process.exitCode = 2;
  else if (options.requireAi && aiUnavailable) process.exitCode = 3;
}

function parseOptions(args) {
  const result = {
    shotNumber: 0,
    previewDir: undefined,
    requireAi: false,
  };
  for (const arg of args) {
    if (arg.startsWith('--shot=')) {
      const value = Number(arg.slice('--shot='.length));
      if (!Number.isInteger(value) || value < 1) throw new Error(`Invalid ${arg}`);
      result.shotNumber = value;
    } else if (arg.startsWith('--preview-dir=')) {
      result.previewDir = arg.slice('--preview-dir='.length);
    } else if (arg === '--require-ai') {
      result.requireAi = true;
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  if (!result.shotNumber) throw new Error('--shot=<number> is required.');
  return result;
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : '';
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
