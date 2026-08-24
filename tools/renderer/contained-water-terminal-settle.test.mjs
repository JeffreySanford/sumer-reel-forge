import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import * as ts from 'typescript';

const rendererPath = resolve(
  'tools/animation/src/ContainedWaterMaterialLayer.tsx',
);
const policyPath = resolve('tools/animation/src/contained-water-motion.ts');

async function loadPolicy() {
  const source = await readFile(policyPath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const url = `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`;
  return import(url);
}

test('contained water fades broad bright crests before the final review beat while preserving refraction', async () => {
  const source = await readFile(rendererPath, 'utf8');

  assert.match(source, /containedWaterRefractionSettle\(progress\)/);
  assert.match(source, /containedWaterReadableRippleSettle\(progress\)/);
  assert.match(
    source,
    /const envelope = Math\.sin\(Math\.PI \* cycle\) \* readableRippleSettle/,
  );
  assert.match(source, /feDisplacementMap/);
  assert.doesNotMatch(source, /repeating-linear-gradient/);
});

test('contained-water settle policy removes the terminal bright crest without freezing refraction', async () => {
  const policy = await loadPolicy();

  assert.ok(
    Math.abs(policy.containedWaterRefractionSettle(0.9) - 5 / 6) < 1e-9,
  );
  assert.equal(policy.containedWaterTerminalRippleFade(0.9), 1);
  assert.ok(
    policy.containedWaterReadableRippleSettle(0.95) > 0,
    'broad ripple should fade progressively rather than disappear abruptly',
  );
  assert.equal(policy.containedWaterTerminalRippleFade(1), 0);
  assert.equal(policy.containedWaterReadableRippleSettle(1), 0);
  assert.equal(policy.containedWaterRefractionSettle(1), 0.55);
});
