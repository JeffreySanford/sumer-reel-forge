import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateReelAnimationReadiness } from '../animation/src/reel-animation-readiness.mjs';

const manifest = {
  manifestId: 'fixture',
  shots: [
    {
      sourceShotNumber: 1,
      shotId: 'ready',
      activationPolicy: { requiredLayerIds: ['a'] },
      layers: [
        { id: 'a', state: 'approved', review: { status: 'approved' } },
        { id: 'optional', state: 'planned', review: { status: 'pending' } },
      ],
    },
    {
      sourceShotNumber: 2,
      shotId: 'blocked',
      activationPolicy: { requiredLayerIds: ['b'] },
      layers: [{ id: 'b', state: 'planned', review: { status: 'pending' } }],
    },
  ],
};

test('optional planned layers do not block required asset readiness', () => {
  const result = evaluateReelAnimationReadiness(manifest);
  assert.equal(result.rows[0].requiredAssetsReady, true);
  assert.equal(result.rows[0].releaseGate, 'REQUIRED-ASSETS-READY');
  assert.equal(result.rows[0].optional.length, 1);
});

test('missing required approval blocks only the affected shot', () => {
  const result = evaluateReelAnimationReadiness(manifest);
  assert.equal(result.rows[1].requiredAssetsReady, false);
  assert.equal(result.rows[1].releaseGate, 'BLOCKED-REQUIRED-ASSET');
  assert.equal(result.summary.blockedShots, 1);
});

test('accepted motion baseline is recorded independently from asset readiness', () => {
  const motionBaselines = new Map([[1, {
    candidateId: 'counter-sway',
    humanStatus: 'accepted',
    semanticResearchBlocking: false,
  }]]);
  const result = evaluateReelAnimationReadiness(manifest, { motionBaselines });
  assert.equal(result.rows[0].motionBaseline.candidateId, 'counter-sway');
  assert.equal(result.rows[0].requiredAssetsReady, true);
  assert.equal(result.summary.acceptedMotionBaselines, 1);
});
