import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isLiteralContainmentClaim,
  reconcileAiWithDeterministicEvidence,
} from '../scripts/reconcile-animation-review.mjs';

function containmentQa({ spillPixels = 0, pass = true } = {}) {
  return {
    applicable: true,
    pass,
    targets: [
      {
        layerId: 'shot05-welcome-water-v1',
        pass,
        comparisons: [
          { pass, spillPixels, changedPixels: 220000 },
          { pass, spillPixels, changedPixels: 225000 },
          { pass, spillPixels, changedPixels: 230000 },
        ],
      },
    ],
  };
}

function aiFinding(overrides = {}) {
  return {
    category: 'boundary',
    severity: 'medium',
    layerId: 'shot05-welcome-water-v1',
    origin: 'animation-introduced',
    description: 'Water ripple extends beyond the basin boundary.',
    evidence: 'A candidate frame appears to cross the basin edge.',
    ...overrides,
  };
}

function aiReview(finding) {
  return {
    status: 'FAIL_ADVISORY',
    rawStatus: 'FAIL_ADVISORY',
    advisoryOnly: true,
    confidence: 0.98,
    summary: 'Boundary concern.',
    findings: [finding],
    materialAssessments: [],
    recommendations: [],
    deltaPolicy: {
      blockingFindingCount: 1,
      sourceBaselineFindingCount: 0,
    },
  };
}

test('literal leakage claim is downgraded when deterministic containment proves zero spill', () => {
  const result = reconcileAiWithDeterministicEvidence({
    ai: aiReview(aiFinding()),
    containmentQa: containmentQa(),
  });

  assert.equal(result.ai.status, 'PASS_ADVISORY');
  assert.equal(result.ai.rawStatus, 'FAIL_ADVISORY');
  assert.equal(result.ai.deltaPolicy.blockingFindingCount, 0);
  assert.equal(result.reconciliation.reconciledFindingCount, 1);
  assert.equal(result.ai.findings[0].severity, 'low');
  assert.equal(result.ai.findings[0].originalSeverity, 'medium');
  assert.equal(
    result.ai.findings[0].deterministicReconciliation.status,
    'DISPUTED_BY_DETERMINISTIC_EVIDENCE',
  );
  assert.equal(
    result.ai.findings[0].deterministicReconciliation.totalSpillPixels,
    0,
  );
});

test('literal leakage claim remains blocking when deterministic containment records spill', () => {
  const result = reconcileAiWithDeterministicEvidence({
    ai: aiReview(aiFinding()),
    containmentQa: containmentQa({ spillPixels: 2, pass: false }),
  });

  assert.equal(result.ai.status, 'FAIL_ADVISORY');
  assert.equal(result.ai.deltaPolicy.blockingFindingCount, 1);
  assert.equal(result.reconciliation.reconciledFindingCount, 0);
  assert.equal(result.ai.findings[0].severity, 'medium');
});

test('perceptual rim crowding is not erased by geometric containment proof', () => {
  const finding = aiFinding({
    category: 'perceptual_edge_interference',
    description: 'The bright crest visually crowds the stone rim.',
    evidence: 'The concern is highlight proximity to the rim, not measured geometry.',
  });
  const result = reconcileAiWithDeterministicEvidence({
    ai: aiReview(finding),
    containmentQa: containmentQa(),
  });

  assert.equal(isLiteralContainmentClaim(finding), false);
  assert.equal(result.ai.status, 'FAIL_ADVISORY');
  assert.equal(result.ai.deltaPolicy.blockingFindingCount, 1);
  assert.equal(result.reconciliation.reconciledFindingCount, 0);
});

test('literal containment classifier detects geometric escape language', () => {
  assert.equal(isLiteralContainmentClaim(aiFinding()), true);
  assert.equal(
    isLiteralContainmentClaim(
      aiFinding({
        category: 'composition',
        description: 'The overall shot feels staged.',
        evidence: 'No geometric containment concern is asserted.',
      }),
    ),
    false,
  );
});
