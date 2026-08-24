import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  buildMaterialMotionStateEvidence,
  reconcileFindingWithMotionState,
  selectFocusedMaterialEvidence,
} from '../scripts/animation-review-motion-state.mjs';
import { reconcileAiWithMotionState } from '../scripts/reconcile-animation-review-evidence.mjs';

const materialQa = {
  targets: [
    {
      layerId: 'shot05-welcome-water-v1',
      role: 'water',
      material: 'water',
      activePresets: ['waterPulse'],
      comparisons: [
        {
          id: 'practical-still',
          frame: 0,
          progress: 0,
          meanAbsoluteDifference: 2.2,
          changedPixelRatio: 0.1,
          normalPath: '0-normal.png',
          frozenPath: '0-frozen.png',
          differencePath: '0-difference.png',
        },
        {
          id: 'water-welcome',
          frame: 105,
          progress: 0.5,
          meanAbsoluteDifference: 2.3,
          changedPixelRatio: 0.105,
          normalPath: '105-normal.png',
          frozenPath: '105-frozen.png',
          differencePath: '105-difference.png',
        },
        {
          id: 'settled-purpose',
          frame: 209,
          progress: 1,
          meanAbsoluteDifference: 2.29,
          changedPixelRatio: 0.106,
          normalPath: '209-normal.png',
          frozenPath: '209-frozen.png',
          differencePath: '209-difference.png',
        },
      ],
    },
  ],
};

test('focused material evidence always includes the terminal comparison', () => {
  const focused = selectFocusedMaterialEvidence(materialQa);
  assert.equal(focused.target.layerId, 'shot05-welcome-water-v1');
  assert.equal(focused.middle.frame, 105);
  assert.equal(focused.terminal.frame, 209);
  assert.equal(focused.terminal.differencePath, '209-difference.png');
});

test('terminal water motion state proves broad ripple is off while refraction remains alive', () => {
  const states = buildMaterialMotionStateEvidence(materialQa);
  const terminal = states.find((state) => state.frame === 209);
  assert.equal(terminal.water.broadRippleWeight, 0);
  assert.equal(terminal.water.terminalRippleFade, 0);
  assert.equal(terminal.water.refractionWeight, 0.55);
});

test('literal repeating broad-ripple complaint at terminal frame becomes a low perceptual advisory', () => {
  const states = buildMaterialMotionStateEvidence(materialQa);
  const finding = {
    category: 'animation-introduced',
    severity: 'medium',
    layerId: 'shot05-welcome-water-v1',
    origin: 'animation-introduced',
    description:
      'Water ripple pattern in frame 209 appears as a uniform repeating circular wave pattern.',
    evidence: 'Frame 209 settled-purpose.',
  };
  const reconciled = reconcileFindingWithMotionState(finding, states);
  assert.ok(reconciled);
  assert.equal(reconciled.severity, 'low');
  assert.equal(
    reconciled.deterministicReconciliation.status,
    'DISPUTED_BY_RUNTIME_MOTION_STATE',
  );
  assert.equal(reconciled.deterministicReconciliation.broadRippleWeight, 0);
  assert.equal(reconciled.deterministicReconciliation.refractionWeight, 0.55);
});

test('generic fine-refraction texture complaint is not automatically dismissed', () => {
  const states = buildMaterialMotionStateEvidence(materialQa);
  const finding = {
    category: 'material-texture',
    severity: 'medium',
    layerId: 'shot05-welcome-water-v1',
    origin: 'animation-introduced',
    description:
      'Fine refraction in frame 209 looks unnaturally repetitive and loses source micro-texture.',
    evidence: 'Normal versus frozen control.',
  };
  assert.equal(reconcileFindingWithMotionState(finding, states), null);
});

test('motion-state reconciliation clears only the contradicted blocker', () => {
  const states = buildMaterialMotionStateEvidence(materialQa);
  const ai = {
    status: 'FAIL_ADVISORY',
    rawStatus: 'FAIL_ADVISORY',
    motionStateEvidence: states,
    findings: [
      {
        category: 'motion',
        severity: 'medium',
        layerId: 'shot05-welcome-water-v1',
        origin: 'animation-introduced',
        description: 'Frame 209 shows a uniform repeating circular ripple wave.',
        evidence: 'Frame 209.',
      },
    ],
    deltaPolicy: { blockingFindingCount: 1 },
  };
  const result = reconcileAiWithMotionState(ai);
  assert.equal(result.ai.status, 'PASS_ADVISORY');
  assert.equal(result.ai.deltaPolicy.blockingFindingCount, 0);
  assert.deepEqual(result.reconciledIndexes, [0]);
});

test('review runtime routes through evidence-aware critic and reconciliation', async () => {
  const source = await readFile(
    resolve('tools/scripts/review-animation-shot-runtime.mjs'),
    'utf8',
  );
  assert.match(source, /review-animation-shot-delta-vision-evidence\.mjs/);
  assert.match(source, /reconcile-animation-review-evidence\.mjs/);
});
