import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const scriptPath = resolve('tools/scripts/shot03-enki-rive-neutral-candidate-check.mjs');
const source = await readFile(scriptPath, 'utf8');

test('neutral candidate handoff reuses the latest ENKI-RIG-0 prep workspace', () => {
  assert.match(source, /tmp\/animation-assets\/rig-prep\/enki\/v1/);
  assert.match(source, /EXPECTED_GATE = 'ENKI-RIG-0'/);
  assert.match(source, /source-receipt\.json/);
  assert.match(source, /neutral-authoring-contract\.json/);
});

test('neutral candidate handoff keeps motion and runtime acceptance blocked while candidate is missing', () => {
  assert.match(source, /\[WAIT\] Neutral \.riv candidate does not exist yet\./);
  assert.match(source, /do not crop, resample, mesh, bone, deform, animate, or add a state machine/);
  assert.match(source, /Runtime installation and motion authoring remain blocked/);
});

test('neutral candidate handoff verifies source identity before accepting a candidate file', () => {
  assert.match(source, /referenceSha !== sourceReceipt\.sourceSha256/);
  assert.match(source, /referenceSha !== sourceReceipt\.copiedSha256/);
  assert.match(source, /candidateStats\.size <= 0/);
  assert.match(source, /candidate-handoff\.json/);
});

test('candidate existence never claims neutral identity acceptance', () => {
  assert.match(source, /File existence is not neutral identity acceptance/);
  assert.match(source, /Runtime inspection\/render proof is the next gate/);
  assert.match(source, /do not author motion yet/);
});
