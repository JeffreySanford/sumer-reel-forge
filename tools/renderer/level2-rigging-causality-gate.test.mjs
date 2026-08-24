import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const rendererPath = 'tools/animation/src/SceneV2ResolvedBenchmark.tsx';

function riggingBranch(source) {
  const marker = "if (layer.motionPresets.includes('riggingTension'))";
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, 'Scene V2 renderer is missing riggingTension handling.');
  const nextBranch = source.indexOf("if (layer.motionPresets.includes('clothLag'))", start);
  assert.notEqual(nextBranch, -1, 'Could not bound the riggingTension renderer branch.');
  return source.slice(start, nextBranch);
}

test('Level 2 rigging causality gate recognizes the current independent oscillator as insufficient', async () => {
  const source = await readFile(rendererPath, 'utf8');
  const branch = riggingBranch(source);

  assert.match(branch, /Math\.sin\(phase \* 0\.61 \+ 0\.9\)/);
  assert.match(branch, /Math\.sin\(phase \* 0\.43 \+ 0\.4\)/);
  assert.doesNotMatch(branch, /vessel|heavyPhysical|driver|lagSeconds|delayed/i);
});

test('ACTIVE LEVEL 2 RIGGING GATE: rigging tension is causally driven by delayed vessel motion', async () => {
  const source = await readFile(rendererPath, 'utf8');
  const branch = riggingBranch(source);

  assert.match(
    branch,
    /vessel|heavyPhysical|driver/i,
    'riggingTension must derive its response from the vessel/heavyPhysical driver instead of an independent oscillator.',
  );
  assert.match(
    branch,
    /lag|delay/i,
    'riggingTension must encode a real lag/delay relationship to its vessel driver.',
  );
  assert.doesNotMatch(
    branch,
    /Math\.sin\(phase \* 0\.61 \+ 0\.9\)|Math\.sin\(phase \* 0\.43 \+ 0\.4\)/,
    'Remove the legacy independent rigging oscillator once vessel-driven secondary motion is implemented.',
  );
});
