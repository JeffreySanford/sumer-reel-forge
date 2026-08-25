import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const path = 'tools/scripts/shot03-level2-dev-loop.mjs';

test('Shot 3 Level 2 dev loop stays focused and does not let the known red milestone block preview rendering', async () => {
  const source = await readFile(path, 'utf8');

  assert.match(source, /level2-candidate-audition\.test\.mjs/);
  assert.match(source, /level2-rigging-causality-gate\.test\.mjs/);
  assert.match(source, /level2-living-shot-gate\.test\.mjs/);
  assert.doesNotMatch(source, /tools\/renderer\/\*\.test\.mjs/);
  assert.match(source, /known-red/);
  assert.match(source, /shot03-level2-rigging\.mjs/);
  assert.match(source, /preview/);
  assert.match(source, /shot03-level2-status\.json/);
  assert.match(source, /STATUS: CONTINUE/);
});
