import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const repairPath = resolve('tools/scripts/repair-background-from-overlay.mjs');
const repairEnginePath = resolve(
  'tools/scripts/repair-background-from-overlay-engine.mjs',
);
const verifyPath = resolve('tools/scripts/verify-background-repair-candidate.mjs');
const candidatePreviewPath = resolve(
  'tools/scripts/render-layered-candidate-scene-v2.ts',
);

test('finish-shot background repair scripts are syntactically valid', () => {
  for (const path of [repairPath, repairEnginePath, verifyPath]) {
    const result = spawnSync(process.execPath, ['--check', path], {
      cwd: resolve('.'),
      encoding: 'utf8',
      windowsHide: true,
    });
    assert.equal(
      result.status,
      0,
      `${path} failed node --check:\n${result.stderr || result.stdout}`,
    );
  }
});

test('finish-shot repair requires verified foreground alpha and preserves pixels outside its mask', async () => {
  const source = await readFile(repairEnginePath, 'utf8');
  assert.match(source, /qa\.qaStatus !== 'PASS'/);
  assert.match(source, /alphaextract,format=gray/);
  assert.match(source, /resegmentForegroundForBackground: false/);
  assert.match(source, /compositeOnlyThroughValidatedMask: true/);
  assert.match(source, /preserveFullCanvasOutsideMask: true/);
  assert.match(source, /minMaskRatio: 0\.001/);
});

test('finish-shot repair QA checks outside preservation and inside reconstruction', async () => {
  const source = await readFile(verifyPath, 'utf8');
  assert.match(source, /foreground-structure-qa/);
  assert.match(source, /outside-preservation/);
  assert.match(source, /inside-reconstruction/);
  assert.match(source, /minMaskRatio: 0\.001/);
  assert.match(source, /Human review is still required before promotion/);
});

test('finish-shot layered candidate renderer has no undeclared dotenv dependency', async () => {
  const source = await readFile(candidatePreviewPath, 'utf8');
  assert.doesNotMatch(source, /dotenv\/config/);
  assert.match(source, /resolveQaPassedCandidate/);
  assert.match(source, /Audition the exact QA-passed required candidates/);
});

test('finish-shot package commands expose repair and candidate preview lanes', async () => {
  const packageJson = JSON.parse(await readFile(resolve('package.json'), 'utf8'));
  const scripts = packageJson.scripts ?? {};

  assert.match(scripts['animation:shot6:background:generate'] ?? '', /shot=6/);
  assert.match(scripts['animation:shot6:candidate-preview'] ?? '', /--shot=6/);
  assert.match(scripts['animation:shot6:candidate-verify'] ?? '', /--shot=6/);

  assert.match(scripts['animation:shot7:candidate-preview'] ?? '', /--shot=7/);
  assert.match(scripts['animation:shot7:candidate-verify'] ?? '', /--shot=7/);

  assert.match(scripts['animation:shot8:background:generate'] ?? '', /shot=8/);
  assert.match(scripts['animation:shot8:candidate-preview'] ?? '', /--shot=8/);
  assert.match(scripts['animation:shot8:candidate-verify'] ?? '', /--shot=8/);
});
