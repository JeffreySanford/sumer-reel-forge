import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const runtimeSource = readFileSync(
  'tools/scripts/review-animation-shot-runtime.mjs',
  'utf8',
);

test('managed delta vision review owns one Ollama GPU lease across warm-up and critique', () => {
  assert.match(
    runtimeSource,
    /import \{ withGpuAiTask \} from '\.\.\/runtime\/gpu-ai-task\.mjs';/,
  );
  assert.match(runtimeSource, /owner:\s*'animation-shot-review'/);
  assert.match(runtimeSource, /task:\s*`shot-\$\{shotNumber\}-delta-vision-review`/);
  assert.match(runtimeSource, /backend:\s*'ollama'/);

  const leaseStart = runtimeSource.indexOf('deltaExit = await withGpuAiTask(');
  const warmup = runtimeSource.indexOf('await warmVisionModel()', leaseStart);
  const critique = runtimeSource.indexOf(
    "'tools/scripts/review-animation-shot-delta-vision-evidence.mjs'",
    leaseStart,
  );

  assert.ok(leaseStart >= 0, 'managed review must acquire the shared GPU lease');
  assert.ok(warmup > leaseStart, 'vision model warm-up must occur inside the lease');
  assert.ok(critique > warmup, 'delta vision critique must remain inside the same lease');
});
