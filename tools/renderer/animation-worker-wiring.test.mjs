import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const worker = await readFile('tools/scripts/animation-worker.mjs', 'utf8');

test('animation worker delegates to existing production authorities', () => {
  assert.match(worker, /plan-animation-shot\.mjs/);
  assert.match(worker, /run-animation-production-lane\.mjs/);
  assert.match(worker, /run-animation-shot-candidates\.mjs/);
});

test('animation worker never owns a broad GPU lease or promotion authority', () => {
  assert.doesNotMatch(worker, /withGpuAiTask|gpu-ai-task/);
  assert.doesNotMatch(worker, /promote-reviewed-shot|APPROVE_SHOT_/);
  assert.match(worker, /it never promotes animation-v1/);
});

test('animation worker disables desktop opening for unattended execution', () => {
  assert.match(worker, /SRF_NO_OPEN: '1'/);
});

test('animation worker does not blindly retry failed deterministic QA', () => {
  assert.match(worker, /deterministic QA failures are not auto-retried/);
  assert.doesNotMatch(worker, /setTimeout\([^)]*executeJob/);
});
