import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../scripts/shot03-enki-rive-neutral-prep.mjs', import.meta.url),
  'utf8',
);

const contractSource = readFileSync(
  new URL(
    '../../libs/animation-rive/src/lib/rive-neutral-contract.ts',
    import.meta.url,
  ),
  'utf8',
);

test('neutral rig prep derives from the accepted recovered-character proof', () => {
  assert.match(source, /pixi-shot03-recovered-character-motion-proof/);
  assert.match(source, /technicalEvidence\?\.pass !== true/);
  assert.match(source, /sourceAssets\?\.enki/);
  assert.match(source, /Accepted recovered Enki digest changed/);
  assert.match(source, /byte-identical/);
});

test('neutral rig prep remains candidate-only and does not invent a Rive file', () => {
  assert.match(source, /tmp\/animation-assets\/rig-prep\/enki\/v1/);
  assert.match(source, /enki-neutral-v1\.riv/);
  assert.match(source, /No \.riv is generated automatically/);
  assert.match(source, /canonicalAssetsMutated: false/);
  assert.match(source, /canonicalManifestMutated: false/);
  assert.match(source, /generatedPixels: false/);
  assert.doesNotMatch(source, /ComfyUI|OLLAMA|SAM3_Detect/);
});

test('Rive runtime adoption is deferred until the neutral candidate exists', () => {
  assert.match(contractSource, /@rive-app\/webgl2/);
  assert.match(contractSource, /version: '2\.40\.1'/);
  assert.match(contractSource, /dependencyInstalled: false/);
  assert.match(source, /installation remains deferred/);
});

test('ENKI-RIG-0 forbids autonomous playback and motion channels', () => {
  assert.match(contractSource, /ENKI-RIG-0/);
  assert.match(contractSource, /autoplay: false/);
  assert.match(contractSource, /autonomousClockAllowed: false/);
  assert.match(contractSource, /animatedChannels: Object\.freeze\(\[\]\)/);
  assert.match(contractSource, /motionAuthoringAllowedBeforeNeutralApproval: false/);
  assert.match(source, /Do not author motion before neutral identity is human-approved/);
});
