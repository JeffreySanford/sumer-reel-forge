import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const rendererPath = resolve(
  'tools/animation/src/ContainedWaterMaterialLayer.tsx',
);

test('contained water fades broad bright crests before the final review beat while preserving refraction', async () => {
  const source = await readFile(rendererPath, 'utf8');

  assert.match(source, /const refractionSettle\s*=/);
  assert.match(source, /const terminalRippleFade\s*=/);
  assert.match(source, /progress > 0\.9/);
  assert.match(source, /Math\.max\(0, 1 - \(progress - 0\.9\) \/ 0\.1\)/);
  assert.match(
    source,
    /const readableRippleSettle = refractionSettle \* terminalRippleFade/,
  );
  assert.match(
    source,
    /const envelope = Math\.sin\(Math\.PI \* cycle\) \* readableRippleSettle/,
  );
  assert.match(source, /feDisplacementMap/);
  assert.doesNotMatch(source, /repeating-linear-gradient/);
});
