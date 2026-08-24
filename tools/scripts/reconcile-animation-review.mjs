import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { newestCompletePreviewDirectory } from './verify-material-local-motion.mjs';

const PREVIEW_BASE = resolve('tmp/animation-previews');

export function reconcileAiWithDeterministicEvidence({ ai, containmentQa }) {
  if (!ai || ai.status === 'SKIPPED') {
    return {
      ai,
      reconciliation: {
        applied: false,
        reconciledFindingCount: 0,
        reason: ai?.status === 'SKIPPED' ? 'AI review was unavailable.' : 'No AI review exists.',
      },
    };
  }

  const findings = Array.isArray(ai.findings) ? ai.findings : [];
  const reconciledIndexes = [];
  const reconciledFindings = findings.map((finding, index) => {
    const containmentEvidence = deterministicContainmentEvidence(
      finding,
      containmentQa,
    );
    if (!containmentEvidence || !isLiteralContainmentClaim(finding)) {
      return finding;
    }

    reconciledIndexes.push(index);
    return {
      ...finding,
      originalSeverity: finding.severity,
      severity: 'low',
      effectiveCategory: 'perceptual_edge_interference',
      deterministicReconciliation: {
        status: 'DISPUTED_BY_DETERMINISTIC_EVIDENCE',
        gate: 'camera-matched-contained-material-boundary',
        layerId: finding.layerId,
        reviewBeatCount: containmentEvidence.reviewBeatCount,
        totalChangedPixels: containmentEvidence.totalChangedPixels,
        totalSpillPixels: containmentEvidence.totalSpillPixels,
        rule:
          'A literal geometric containment claim cannot remain blocking when the camera-matched pixel gate passed every review beat with zero spill. Any remaining concern is perceptual edge/rim interference only.',
      },
    };
  });

  const blockingFindings = reconciledFindings.filter(
    (finding) =>
      ['medium', 'high'].includes(finding.severity) &&
      finding.origin !== 'source-baseline',
  );
  const sourceBaselineFindings = reconciledFindings.filter(
    (finding) => finding.origin === 'source-baseline',
  );

  const rawStatus = ai.rawStatus ?? ai.status;
  const effectiveStatus = blockingFindings.length
    ? ai.status === 'PASS_ADVISORY'
      ? 'REVIEW_REQUIRED'
      : ai.status
    : 'PASS_ADVISORY';

  const reconciledAi = {
    ...ai,
    rawStatus,
    status: effectiveStatus,
    findings: reconciledFindings,
    deltaPolicy: {
      ...(ai.deltaPolicy ?? {}),
      blockingFindingCount: blockingFindings.length,
      sourceBaselineFindingCount: sourceBaselineFindings.length,
      blockingFindingIndexes: blockingFindings.map((finding) =>
        reconciledFindings.indexOf(finding),
      ),
      sourceBaselineFindingIndexes: sourceBaselineFindings.map((finding) =>
        reconciledFindings.indexOf(finding),
      ),
      deterministicReconciledFindingIndexes: reconciledIndexes,
      rule:
        'Medium/high animation-introduced or uncertain findings block readiness unless a matching deterministic gate directly disproves the literal claim. Source-baseline findings and deterministically disproved geometric claims are advisory.',
    },
  };

  return {
    ai: reconciledAi,
    reconciliation: {
      applied: reconciledIndexes.length > 0,
      reconciledFindingCount: reconciledIndexes.length,
      reconciledFindingIndexes: reconciledIndexes,
      remainingBlockingFindingCount: blockingFindings.length,
      rule:
        'Deterministic pixel/geometry evidence is authoritative for directly measured containment facts; AI remains authoritative only as an advisory perceptual critic.',
    },
  };
}

export function isLiteralContainmentClaim(finding) {
  const text = [finding?.category, finding?.description, finding?.evidence]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const containmentTopic = /(boundary|basin|contain|spill|leak|bleed|rim|edge)/.test(
    text,
  );
  const literalEscapeClaim = /(outside|beyond|cross(?:es|ed|ing)?\b|extend(?:s|ed|ing)?\s+(?:past|beyond|outside)|\bspill(?:s|ed|ing)?\b|\bleak(?:s|ed|ing)?\b|\bbleed(?:s|ed|ing)?\b)/.test(
    text,
  );
  return containmentTopic && literalEscapeClaim;
}

function deterministicContainmentEvidence(finding, containmentQa) {
  if (!containmentQa || containmentQa.applicable === false || containmentQa.pass !== true) {
    return null;
  }
  if (typeof finding?.layerId !== 'string' || !finding.layerId) return null;

  const target = (containmentQa.targets ?? []).find(
    (candidate) => candidate.layerId === finding.layerId,
  );
  if (!target || target.pass !== true || !(target.comparisons ?? []).length) return null;

  const comparisons = target.comparisons ?? [];
  if (
    !comparisons.every(
      (comparison) => comparison.pass === true && Number(comparison.spillPixels) === 0,
    )
  ) {
    return null;
  }

  return {
    reviewBeatCount: comparisons.length,
    totalChangedPixels: comparisons.reduce(
      (sum, comparison) => sum + Number(comparison.changedPixels ?? 0),
      0,
    ),
    totalSpillPixels: comparisons.reduce(
      (sum, comparison) => sum + Number(comparison.spillPixels ?? 0),
      0,
    ),
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

  const { ai, reconciliation } = reconcileAiWithDeterministicEvidence({
    ai: review.ai,
    containmentQa,
  });

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

  review.schemaVersion = Math.max(Number(review.schemaVersion ?? 1), 4);
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
    'deterministic-ai-reconciliation.json',
  );
  writeFileSync(
    reconciliationPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
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
  if (reconciliation.reconciledFindingCount > 0) {
    for (const index of reconciliation.reconciledFindingIndexes ?? []) {
      const finding = ai.findings[index];
      const evidence = finding.deterministicReconciliation;
      console.log(
        `[reconciled] finding ${index + 1}: ${evidence.totalSpillPixels} spill pixels across ${evidence.reviewBeatCount} beats / ${evidence.totalChangedPixels} changed pixels; retained as LOW perceptual edge advisory.`,
      );
    }
  } else {
    console.log('[ok] no AI finding was directly contradicted by a deterministic gate.');
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
