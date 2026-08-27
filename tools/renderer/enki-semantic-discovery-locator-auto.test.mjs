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
