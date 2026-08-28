import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const forge = await readFile('tools/cli/forge.mjs', 'utf8');

test('Forge CLI uses the API for animation production state and jobs', () => {
  assert.match(forge, /\/runtime\/animation-production/);
  assert.match(forge, /\/runtime\/gpu-status/);
  assert.match(forge, /\/animation-jobs/);
});

test('Forge CLI queues planner, lane, and required-candidate work without filesystem production logic', () => {
  assert.match(forge, /operation: 'plan'/);
  assert.match(forge, /operation: 'candidates'/);
  assert.match(forge, /\['preflight', 'generate', 'verify', 'run'\]/);
  assert.doesNotMatch(forge, /spawn|execFile|readFile|writeFile/);
});

test('Forge CLI deliberately exposes no promotion command yet', () => {
  assert.doesNotMatch(forge, /APPROVE_SHOT_|promote-reviewed-shot/);
  assert.match(forge, /stop before promotion/);
});
