import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const warmSource = readFileSync(
  resolve('tools/scripts/warm-ollama-planning.mjs'),
  'utf8',
);
const statusSource = readFileSync(
  resolve('tools/scripts/gpu-resource-status.mjs'),
  'utf8',
);

test('managed workstation startup does not pin the text planner in shared GPU VRAM by default', () => {
  assert.match(warmSource, /SRF_HARDWARE_PROFILE_PATH/);
  assert.match(warmSource, /OLLAMA_WARM_ON_START/);
  assert.match(warmSource, /skipping \$\{model\} warm-up/);
  assert.match(warmSource, /load lazily on first use/);
  assert.doesNotMatch(warmSource, /OLLAMA_KEEP_ALIVE\s*=\s*['"]0['"]/);
});

test('GPU status uses the same HTTP telemetry path as task receipts instead of the Ollama CLI', () => {
  assert.match(statusSource, /collectGpuRuntimeTelemetry/);
  assert.match(statusSource, /resident models may still consume VRAM/);
  assert.doesNotMatch(statusSource, /spawnSync\(['"]ollama['"]/);
  assert.doesNotMatch(statusSource, /\['"]ps['"]\]/);
});
