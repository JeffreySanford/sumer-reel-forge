import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateRenderedBlinkVerdict } from '../animation/src/level2-rendered-blink-verdict.mjs';

const cleanSemantic = {
  naturalBlinkVisible: true,
  closedFrameIndexes: [2],
  cyanPatchVisible: false,
  flatMaskLeakVisible: false,
  bothEyesCloseTogether: true,
  returnsOpen: true,
  confidence: 0.94,
};

test('rendered blink verdict accepts a clean closed-eye sequence', () => {
  const result = evaluateRenderedBlinkVerdict({
    frameAnalyses: [
      { frame: 93, activeBlink: false, appearance: { pass: true } },
      { frame: 99, activeBlink: true, appearance: { pass: true } },
      { frame: 102, activeBlink: true, appearance: { pass: true } },
      { frame: 108, activeBlink: false, appearance: { pass: true } },
    ],
    semanticReview: cleanSemantic,
  });
  assert.equal(result.pass, true, result.failures.join('; '));
});

test('rendered blink verdict rejects cyan leakage even if semantic review says blink', () => {
  const result = evaluateRenderedBlinkVerdict({
    frameAnalyses: [
      { frame: 99, activeBlink: true, appearance: { pass: false } },
      { frame: 102, activeBlink: true, appearance: { pass: true } },
    ],
    semanticReview: cleanSemantic,
  });
  assert.equal(result.pass, false);
  assert.ok(result.failures.some((failure) => /cyan\/flat mask leakage/i.test(failure)));
});

test('rendered blink verdict rejects a flat mask sequence with no closed frame', () => {
  const result = evaluateRenderedBlinkVerdict({
    frameAnalyses: [{ frame: 102, activeBlink: true, appearance: { pass: true } }],
    semanticReview: {
      ...cleanSemantic,
      naturalBlinkVisible: false,
      closedFrameIndexes: [],
      flatMaskLeakVisible: true,
      bothEyesCloseTogether: false,
      confidence: 0.98,
    },
  });
  assert.equal(result.pass, false);
  assert.ok(result.failures.some((failure) => /flat mask\/proof overlay/i.test(failure)));
  assert.ok(result.failures.some((failure) => /no semantically confirmed closed-eye frame/i.test(failure)));
});
