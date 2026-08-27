import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const wrapper = readFileSync(
  resolve('tools/scripts/shot03-enki-semantic-discovery-grouped-auto.mjs'),
  'utf8',
);
const hook = readFileSync(
  resolve('tools/scripts/enki-semantic-grouped-vision-hook.mjs'),
  'utf8',
);

const regionIds = [
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
const anchorIds = [
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

test('grouped hook covers every semantic region and anchor exactly once', () => {
  for (const id of [...regionIds, ...anchorIds]) {
    const matches = hook.match(new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? [];
    assert.equal(matches.length, 1, `${id} should occur exactly once in group definitions`);
  }
});

test('grouped hook uses face-head, body-arms, and hands-contact smaller tasks', () => {
  assert.match(hook, /id: 'face-head'/);
  assert.match(hook, /id: 'body-arms'/);
  assert.match(hook, /id: 'hands-contact'/);
  assert.match(hook, /smallerTaskForLocalVisionModel: true/);
  assert.match(hook, /doNotInferOtherGroups: true/);
});

test('each semantic group gets a fresh bounded model timeout and at most one repair', () => {
  assert.match(hook, /MAX_REPAIR_ATTEMPTS_PER_GROUP = 1/);
  assert.match(hook, /AbortSignal\.timeout\(GROUP_TIMEOUT_MS\)/);
  assert.match(hook, /ENKI_SEMANTIC_GROUP_TIMEOUT_MS/);
  assert.match(hook, /text-only bounded repair/);
});

test('group repair cannot change semantic statuses or clamp invalid geometry', () => {
  assert.match(hook, /assertSameStatuses/);
  assert.match(hook, /Coordinate repair only\. Do not re-evaluate the image and do not change any semantic status/);
  assert.match(hook, /x\+width<=1/);
  assert.match(hook, /y\+height<=1/);
  assert.doesNotMatch(hook, /clamp.*discovery|repair.*clamp/i);
});
