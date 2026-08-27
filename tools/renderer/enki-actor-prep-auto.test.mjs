import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const source = await readFile(
  resolve('tools/scripts/shot03-enki-actor-prep-auto.mjs'),
  'utf8',
);

test('automated Enki prep derives from the accepted recovered-character proof', () => {
  assert.match(source, /pixi-shot03-recovered-character-motion-proof/);
  assert.match(source, /technicalEvidence\?\.pass !== true/);
  assert.match(source, /sourceSha256 !== enki\.sha256/);
  assert.match(source, /byte-identical/);
});

test('actor prep encodes zero recurring manual editor work', () => {
  assert.match(source, /headlessDefault: true/);
  assert.match(source, /recurringManualEditorAllowed: false/);
  assert.match(source, /failedAutomationPolicy: 'reject-or-fallback'/);
  assert.match(source, /manualEditorInvocations: 0/);
});

test('semantic regions and anchors begin as automated discovery work', () => {
  for (const token of [
    'region:enki:face',
    'region:enki:torso-robe',
    'region:enki:hand-left',
    'anchor:enki:gaze-origin',
    'anchor:enki:torso-root',
  ]) {
    assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(source, /status: 'pending-auto-discovery'/);
});

test('backend evidence keeps LivePortrait blocked and Rive deferred', () => {
  assert.match(source, /backend:liveportrait-baked-face/);
  assert.match(source, /status: 'license-blocked'/);
  assert.match(source, /InsightFace/);
  assert.match(source, /backend:rive-reusable-rig/);
  assert.match(source, /status: 'deferred'/);
  assert.match(source, /manual \.riv authoring is not the production critical path/i);
});

test('actor prep performs no model generation in the contract-first stage', () => {
  assert.match(source, /modelInvocations: 0/);
  assert.match(source, /generatedPixels: false/);
  assert.doesNotMatch(source, /ComfyUI|inference\.py|python inference/i);
});
