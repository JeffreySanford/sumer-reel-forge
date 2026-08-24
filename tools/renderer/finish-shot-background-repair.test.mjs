import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const repairPath = resolve('tools/scripts/repair-background-from-overlay.mjs');
const verifyPath = resolve('tools/scripts/verify-background-repair-candidate.mjs');

test('finish-shot background repair scripts are syntactically valid', () => {
  for (const path of [repairPath, verifyPath]) {
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
  const source = await readFile(repairPath, 'utf8');
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
