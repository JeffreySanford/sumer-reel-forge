import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const wrapper = readFileSync(resolve('tools/scripts/shot03-enki-semantic-discovery-auto.mjs'), 'utf8');
const hook = readFileSync(resolve('tools/scripts/enki-semantic-vision-proxy-hook.mjs'), 'utf8');

test('proxy autopilot derives visibility from source alpha rather than regenerating Enki', () => {
  assert.match(wrapper, /alphaextract,bbox=min_val=/);
  assert.match(wrapper, /sourcePixelsMutated: false/);
  assert.match(wrapper, /generatedSemanticPixels: false/);
});

test('proxy autopilot keeps original semantic discovery engine and thresholds', () => {
  assert.match(wrapper, /shot03-enki-semantic-discovery\.mjs/);
  assert.doesNotMatch(wrapper, /0\.55|0\.06|containmentRatio/);
});

test('proxy hook replaces only Enki semantic locator image input', () => {
  assert.match(hook, /isEnkiSemanticDiscoveryRequest/);
  assert.match(hook, /images: \[proxyImageBase64\]/);
});

test('proxy hook remaps model output back to registered source coordinates', () => {
  assert.match(hook, /mapDiscoveryFromProxyToSource/);
  assert.match(hook, /registered source/);
});
