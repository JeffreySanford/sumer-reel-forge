import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateActorSemanticGroupDefinition } from '../animation/src/actor-semantic-group-definition.mjs';

const wrapper = readFileSync(
  resolve('tools/scripts/shot03-enki-semantic-discovery-grouped-auto.mjs'),
  'utf8',
);
const compatibilityHook = readFileSync(
  resolve('tools/scripts/enki-semantic-grouped-vision-hook.mjs'),
  'utf8',
);
const genericHook = readFileSync(
  resolve('tools/scripts/actor-semantic-grouped-vision-hook.mjs'),
  'utf8',
);
const definition = validateActorSemanticGroupDefinition(JSON.parse(
  readFileSync(resolve('tools/animation/actors/enki-semantic-groups-v1.json'), 'utf8'),
));

const expectedRegions = [
  'region:enki:head',
  'region:enki:face',
  'region:enki:hair-beard',
  'region:enki:eye-left',
  'region:enki:eye-right',
  'region:enki:crown',
  'region:enki:torso-robe',
  'region:enki:upper-arm-left',
  'region:enki:upper-arm-right',
  'region:enki:forearm-left',
  'region:enki:forearm-right',
  'region:enki:hand-left',
  'region:enki:hand-right',
];
const expectedAnchors = [
  'anchor:enki:gaze-origin',
  'anchor:enki:head-center',
  'anchor:enki:torso-root',
  'anchor:enki:seat-or-stance-root',
  'anchor:enki:hand-left',
  'anchor:enki:hand-right',
];

test('grouped autopilot extends only the evidence-constrained lower boundary', () => {
  assert.match(wrapper, /height: source\.height - locator\.y/);
  assert.match(wrapper, /sideOrTopExpansionPixels: 0/);
  assert.match(wrapper, /lowerBoundaryExtensionPixels: lowerExtension/);
  assert.match(wrapper, /cropAreaShare >= 0\.9/);
});

test('grouped autopilot does not rerun locator, SAM, alpha inference, or mutate source', () => {
  assert.match(wrapper, /samInvocations: 0/);
  assert.match(wrapper, /modelLocatorInvocations: 0/);
  assert.match(wrapper, /sourcePixelsMutated: false/);
  assert.match(wrapper, /generatedSemanticPixels: false/);
  assert.doesNotMatch(wrapper, /alphaextract|SAM3_Detect|JoinImageWithAlpha|\/api\/chat/);
});

test('Enki semantic groups are data and cover every region/anchor exactly once', () => {
  assert.equal(definition.actorId, 'enki');
  assert.deepEqual(definition.groups.map((group) => group.id), ['face-head', 'body-arms', 'hands-contact']);
  assert.deepEqual(definition.groups.flatMap((group) => group.regions).sort(), [...expectedRegions].sort());
  assert.deepEqual(definition.groups.flatMap((group) => group.anchors).sort(), [...expectedAnchors].sort());
});

test('hands-contact is capability-specific and optional for core structure', () => {
  const hands = definition.groups.find((group) => group.id === 'hands-contact');
  assert.equal(hands.capability, 'hand-contact');
  assert.equal(hands.optionalForCoreStructure, true);
});

test('generic grouped hook loads actor group definition and keeps one repair', () => {
  assert.match(genericHook, /loadActorSemanticGroupDefinition/);
  assert.match(genericHook, /ACTOR_SEMANTIC_GROUP_DEFINITION/);
  assert.match(genericHook, /maxCoordinateRepairAttemptsPerGroup/);
  assert.match(genericHook, /AbortSignal\.timeout\(GROUP_TIMEOUT_MS\)/);
  assert.match(genericHook, /Coordinate repair only\. Do not re-evaluate the image and do not change any semantic status/);
  assert.doesNotMatch(genericHook, /region:enki:head|region:enki:hand-left/);
});

test('legacy Enki hook is now only a compatibility adapter', () => {
  assert.match(compatibilityHook, /enki-semantic-groups-v1\.json/);
  assert.match(compatibilityHook, /actor-semantic-grouped-vision-hook\.mjs/);
  assert.doesNotMatch(compatibilityHook, /const GROUPS/);
});
