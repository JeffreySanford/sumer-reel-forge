import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyRiggingBoundaryContact,
  evaluateRiggingRoiCandidateSourceAware,
} from '../animation/src/rigging-roi-boundary-policy.mjs';

const healthy = {
  width: 296,
  height: 675,
  strongAlphaPixels: 22964,
  strongCoverage: 0.1149,
  strongBboxFill: 0.1149,
  significantComponentCount: 5,
  topEightComponentShare: 0.9876,
  strongBbox: { x: 12, y: 0, width: 248, height: 610 },
};

const fidelity = { strongMismatchRatio: 0 };

test('treats top contact as source-boundary contact when ROI itself starts at source top', () => {
  const boundary = classifyRiggingBoundaryContact({
    roi: { x: 544, y: 0, width: 296, height: 675 },
    cropAnalysis: healthy,
    sourceWidth: 941,
    sourceHeight: 1672,
  });
  assert.deepEqual(boundary.touchedSides, ['top']);
  assert.deepEqual(boundary.sourceBoundarySides, ['top']);
  assert.deepEqual(boundary.interiorTouchedSides, []);
});

test('accepts otherwise healthy rigging that touches only a real source-frame boundary', () => {
  const result = evaluateRiggingRoiCandidateSourceAware({
    roi: { x: 544, y: 0, width: 296, height: 675 },
    cropAnalysis: healthy,
    sourceFidelity: fidelity,
    sourceWidth: 941,
    sourceHeight: 1672,
  });
  assert.equal(result.pass, true);
  assert.equal(result.risk, 'MEDIUM');
  assert.match(result.advisories.join('\n'), /source-frame boundary only: top/i);
});

test('still rejects contact with an interior ROI edge', () => {
  const result = evaluateRiggingRoiCandidateSourceAware({
    roi: { x: 544, y: 50, width: 296, height: 675 },
    cropAnalysis: healthy,
    sourceFidelity: fidelity,
    sourceWidth: 941,
    sourceHeight: 1672,
  });
  assert.equal(result.pass, false);
  assert.equal(result.risk, 'HIGH');
  assert.match(result.failures.join('\n'), /interior ROI edge\(s\): top/i);
});

test('does not forgive fragmentation merely because the crop touches source top', () => {
  const result = evaluateRiggingRoiCandidateSourceAware({
    roi: { x: 544, y: 0, width: 296, height: 675 },
    cropAnalysis: {
      ...healthy,
      significantComponentCount: 26,
      topEightComponentShare: 0.7837,
    },
    sourceFidelity: fidelity,
    sourceWidth: 941,
    sourceHeight: 1672,
  });
  assert.equal(result.pass, false);
  assert.match(result.failures.join('\n'), /too fragmented/i);
  assert.match(result.failures.join('\n'), /too much scattered alpha/i);
});
