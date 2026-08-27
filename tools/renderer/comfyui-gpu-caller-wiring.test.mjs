import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  'tools/scripts/animation-layer-candidates.mjs',
  'utf8',
);

test('generic ComfyUI candidate generation holds one lease around internal concurrency', () => {
  assert.match(
    source,
    /import \{ withGpuAiTask \} from '\.\.\/runtime\/gpu-ai-task\.mjs';/,
  );
  assert.match(source, /owner:\s*'animation-layer-candidates'/);
  assert.match(source, /backend:\s*'comfyui'/);

  const leaseStart = source.indexOf('const run = await withGpuAiTask(');
  const generation = source.indexOf(
    'return generateLayerCandidates({ ...options, preflight });',
    leaseStart,
  );

  assert.ok(leaseStart >= 0, 'generic generation must acquire the shared GPU lease');
  assert.ok(
    generation > leaseStart,
    'the complete candidate-generation call, including its internal concurrency, must run inside one lease',
  );
});
