import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../scripts/shot03-recovered-motion-review-montage.mjs', import.meta.url),
  'utf8',
);

test('review montage consumes the latest recovered-motion decision packet', () => {
  assert.match(source, /shot03-recovered-motion-decision-packet/);
  assert.match(source, /Run pnpm animation:shot3:motion-decision-packet first/);
  assert.match(source, /decisionPacketSha256/);
});

test('review montage renders three labeled active stacks without changing acceptance', () => {
  assert.match(source, /PRIMARY/);
  assert.match(source, /COUNTER-SWAY/);
  assert.match(source, /BREATH/);
  assert.match(source, /hstack=inputs=3/);
  assert.match(source, /automaticPromotionAllowed: false/);
  assert.match(source, /Human acceptance remains separate/);
});

test('review montage preserves deferred abandoned lanes', () => {
  assert.match(source, /deferredLanesRemainDeferred: \['blink', 'water', 'rigging'\]/);
  assert.match(source, /Deferred lanes remain deferred/);
});

test('review montage emits active video, contact sheet, A\\/B index and receipt', () => {
  assert.match(source, /shot03-recovered-motion-active-three-up\.mp4/);
  assert.match(source, /shot03-recovered-motion-active-three-up-contact-sheet\.jpg/);
  assert.match(source, /shot03-recovered-motion-ab-index\.md/);
  assert.match(source, /shot03-recovered-motion-review-montage\.json/);
});
