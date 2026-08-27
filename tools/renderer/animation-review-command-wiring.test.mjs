import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
const decisionWrapper = readFileSync(resolve('tools/scripts/shot03-recovered-motion-decision-packet.mjs'), 'utf8');
const montageWrapper = readFileSync(resolve('tools/scripts/shot03-recovered-motion-review-montage.mjs'), 'utf8');

test('Shot 3 package review commands point at tracked wrapper files', () => {
  assert.equal(
    packageJson.scripts['animation:shot3:motion-decision-packet'],
    'node tools/scripts/shot03-recovered-motion-decision-packet.mjs',
  );
  assert.equal(
    packageJson.scripts['animation:shot3:motion-review-montage'],
    'node tools/scripts/shot03-recovered-motion-review-montage.mjs',
  );
});

test('Shot 3 wrappers delegate to generic review tooling and tracked config', () => {
  assert.match(decisionWrapper, /animation-candidate-review-packet\.mjs/);
  assert.match(montageWrapper, /animation-candidate-review-montage\.mjs/);
  assert.match(decisionWrapper, /shot03-recovered-motion\.review-set\.json/);
  assert.match(montageWrapper, /shot03-recovered-motion\.review-set\.json/);
});
