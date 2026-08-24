import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeDeltaReview } from '../scripts/review-animation-shot-delta-vision.mjs';

test('source-baseline findings cannot block delta review readiness by themselves', () => {
  const normalized = normalizeDeltaReview({
    status: 'REVIEW_REQUIRED',
    confidence: 0.98,
    summary: 'Baseline composition concern.',
    findings: [
      {
        category: 'composition',
        severity: 'high',
        layerId: 'shot05-welcome-water-v1',
        origin: 'source-baseline',
        description: 'The source reads as a tableau.',
        evidence: 'Visible in editorial source and candidate.',
      },
    ],
    materialAssessments: [],
    recommendations: [],
  });

  assert.equal(normalized.status, 'PASS_ADVISORY');
  assert.equal(normalized.rawStatus, 'REVIEW_REQUIRED');
  assert.equal(normalized.deltaPolicy.blockingFindingCount, 0);
  assert.equal(normalized.deltaPolicy.sourceBaselineFindingCount, 1);
});

test('medium animation-introduced findings require human review', () => {
  const normalized = normalizeDeltaReview({
    status: 'PASS_ADVISORY',
    confidence: 0.85,
    summary: 'Animation introduced edge bleed.',
    findings: [
      {
        category: 'boundary',
        severity: 'medium',
        layerId: 'shot05-welcome-water-v1',
        origin: 'animation-introduced',
        description: 'Water highlight crosses the basin edge.',
        evidence: 'Candidate-only edge change.',
      },
    ],
    materialAssessments: [],
    recommendations: [],
  });

  assert.equal(normalized.status, 'REVIEW_REQUIRED');
  assert.equal(normalized.deltaPolicy.blockingFindingCount, 1);
});

test('low uncertain findings remain advisory', () => {
  const normalized = normalizeDeltaReview({
    status: 'REVIEW_REQUIRED',
    confidence: 0.6,
    summary: 'Minor uncertain observation.',
    findings: [
      {
        category: 'motion',
        severity: 'low',
        layerId: 'shot05-welcome-water-v1',
        origin: 'uncertain',
        description: 'Subtle motion may be slightly strong.',
        evidence: 'Weak visual evidence.',
      },
    ],
    materialAssessments: [],
    recommendations: [],
  });

  assert.equal(normalized.status, 'PASS_ADVISORY');
  assert.equal(normalized.deltaPolicy.blockingFindingCount, 0);
});
