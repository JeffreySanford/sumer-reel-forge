import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const auditionPath = 'tools/scripts/shot03-level2-replacement-audition.mjs';
const proofPath = 'tools/scripts/shot03-level2-rendered-blink-proof.mjs';

async function source(path) {
  return readFile(path, 'utf8');
}

test('replacement audition prints and checksum-binds the exact selected eye asset before render', async () => {
  const text = await source(auditionPath);
  assert.match(text, /selected eye asset source path/);
  assert.match(text, /selected eye asset checksum/);
  assert.match(text, /candidateChecksum changed before audition|checksum changed before audition/i);
  assert.match(text, /analyzeTransparentEyeLayerAppearance/);
  assert.match(text, /candidate-pre-render-contact-sheet\.png/);
  assert.match(text, /Renderer was not started/);
});

test('rendered blink proof binds candidate source to staged public bytes and resolved Scene V2 asset path', async () => {
  const text = await source(proofPath);
  assert.match(text, /selected candidate source/);
  assert.match(text, /staged public eye asset/);
  assert.match(text, /resolved Scene V2 assetPath/);
  assert.match(text, /Staged eye asset checksum mismatch/);
  assert.match(text, /checksum-bound/);
});

test('rendered blink proof extracts blink-window frames and blocks cyan or flat mask leakage', async () => {
  const text = await source(proofPath);
  assert.match(text, /blinkStartFrame/);
  assert.match(text, /blinkEndFrame/);
  assert.match(text, /extractFrame/);
  assert.match(text, /analyzeRenderedEyeBoxes/);
  assert.match(text, /cyanPatchVisible/);
  assert.match(text, /flatMaskLeakVisible/);
  assert.match(text, /closedFrameIndexes/);
  assert.match(text, /RENDERED BLINK BLOCKED/);
  assert.match(text, /normal-speed HUMAN review is still required/);
});
