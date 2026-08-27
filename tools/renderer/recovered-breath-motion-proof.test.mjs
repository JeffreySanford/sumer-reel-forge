import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../scripts/pixi-shot03-recovered-breath-motion-proof.mjs', import.meta.url),
  'utf8',
);

test('breathing proof uses accepted character motion as its control', () => {
  assert.match(source, /pixi-shot03-recovered-character-motion-proof/);
  assert.match(source, /acceptedCharacterMotionFrozen: true/);
  assert.match(source, /recovered-character-breath-control/);
  assert.match(source, /pixel-identical to accepted counter-sway/i);
});

test('breathing proof binds the benchmark BREATH_VISIBLE frame and exact neutral returns', () => {
  assert.match(source, /SAMPLE_FRAMES = \[0, 55, 110, 165, 209\]/);
  assert.match(source, /NEUTRAL_FRAMES = \[0, 110, 209\]/);
  assert.match(source, /Expected first breathe-calm peak at frame 55/);
  assert.match(source, /peakFrames: \[55, 165\]/);
});

test('breathing proof remains source-preserving and keeps rejected channels disabled', () => {
  assert.match(source, /sourceRegenerationPerformed: false/);
  assert.match(source, /canonicalAssetsMutated: false/);
  assert.match(source, /canonicalManifestMutated: false/);
  assert.match(source, /blinkReactivated: false/);
  assert.match(source, /waterReactivated: false/);
  assert.match(source, /riggingReactivated: false/);
});

test('breathing proof requires human normal-speed review rather than pixel change alone', () => {
  assert.match(source, /Human normal-speed breathing acceptance is required/i);
  assert.match(source, /calm breathing/i);
  assert.match(source, /whole character appears to zoom\/pulse/i);
  assert.match(source, /promotionAllowed: false/);
});
