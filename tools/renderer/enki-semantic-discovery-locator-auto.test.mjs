import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const wrapper = readFileSync(
  resolve('tools/scripts/shot03-enki-semantic-discovery-locator-auto.mjs'),
  'utf8',
);
const proxy = readFileSync(
  resolve('tools/animation/src/actor-semantic-vision-proxy.mjs'),
  'utf8',
);
const hook = readFileSync(
  resolve('tools/scripts/enki-semantic-vision-proxy-hook.mjs'),
  'utf8',
);

test('locator autopilot reuses the exact recorded Enki locator without relocalizing', () => {
  assert.match(wrapper, /report\.locator\?\.targets/);
  assert.match(wrapper, /locatorPixels: located\.bboxPixels/);
  assert.match(wrapper, /modelLocatorInvocations: 0/);
  assert.doesNotMatch(wrapper, /\/api\/chat/);
});

test('locator autopilot bypasses failed full-frame padding and alpha assumptions', () => {
  assert.match(wrapper, /paddingFraction: 0/);
  assert.match(wrapper, /samInvocations: 0/);
  assert.doesNotMatch(wrapper, /alphaextract|SAM3_Detect|JoinImageWithAlpha/);
});

test('locator autopilot uses immutable editorial pixels as a localization guide only', () => {
  assert.match(wrapper, /visionGuideRole: 'immutable editorial source/);
  assert.match(wrapper, /renderExactCrop\(guidePath, proxyPath, crop\)/);
  assert.match(wrapper, /sourcePixelsMutated: false/);
  assert.match(wrapper, /generatedSemanticPixels: false/);
});

test('locator crop still remaps semantic coordinates into registered source space', () => {
  assert.match(proxy, /proxyKind === 'locator-crop'/);
  assert.match(proxy, /exact pre-padding Enki locator crop/);
  assert.match(proxy, /mapProxyBoxToSource/);
  assert.match(proxy, /mapProxyPointToSource/);
});

test('semantic proxy allows exactly one bounded coordinate correction without clamping model geometry', () => {
  assert.match(hook, /MAX_COORDINATE_REPAIR_ATTEMPTS = 1/);
  assert.match(hook, /bounded coordinate correction attempt/);
  assert.match(hook, /x\+width<=1/);
  assert.match(hook, /y\+height<=1/);
  assert.match(hook, /Do not use pixel coordinates, percentages, or a 0\.\.1000 coordinate system/);
  assert.doesNotMatch(hook, /clamp.*discovery|repair.*clamp/i);
});
