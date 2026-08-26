import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const wrapper = readFileSync(
  new URL('../scripts/shot03-rigging-roi-extended-auto.mjs', import.meta.url),
  'utf8',
);
const hook = readFileSync(
  new URL('../scripts/rigging-roi-reuse-latest-locator-hook.mjs', import.meta.url),
  'utf8',
);

test('extended rigging confirmation reuses the exact prior locator instead of relocalizing', () => {
  assert.match(wrapper, /rigging-roi-reuse-latest-locator-hook\.mjs/);
  assert.match(wrapper, /0\.65,0\.80,1\.00/);
  assert.match(wrapper, /reassess-latest-shot03-rigging-roi\.mjs/);
  assert.match(wrapper, /No canonical mutation, inpaint, or motion activation/i);
});

test('locator reuse hook serves only structured rigging locator requests', () => {
  assert.match(hook, /isRiggingLocatorRequest/);
  assert.match(hook, /reusing exact latest rigging locator/i);
  assert.match(hook, /bboxNormalized/);
  assert.doesNotMatch(hook, /Math\.round\([^\n]*1000/);
  assert.doesNotMatch(hook, /\/\s*1000/);
});
