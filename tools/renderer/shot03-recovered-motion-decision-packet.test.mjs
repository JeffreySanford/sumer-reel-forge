import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../scripts/shot03-recovered-motion-decision-packet.mjs', import.meta.url),
  'utf8',
);

test('decision packet compares the three current Shot 3 recovered motion stacks', () => {
  assert.match(source, /pixi-shot03-recovered-motion-proof/);
  assert.match(source, /pixi-shot03-recovered-character-motion-proof/);
  assert.match(source, /pixi-shot03-recovered-breath-motion-proof/);
  assert.match(source, /recommendedDefault: 'counterSway'/);
});

test('decision packet consumes built-in AI advisory reviews without granting acceptance', () => {
  assert.match(source, /aiReviewPath/);
  assert.match(source, /PASS_ADVISORY/);
  assert.match(source, /built-in Ollama advisory reviews/);
  assert.match(source, /automaticPromotionAllowed: false/);
  assert.match(source, /does not promote assets or create an acceptance receipt/i);
});

test('decision packet keeps abandoned Shot 3 lanes deferred', () => {
  assert.match(source, /lane: 'blink'/);
  assert.match(source, /human-invisible at normal speed/);
  assert.match(source, /lane: 'water'/);
  assert.match(source, /sparse\/non-basin/);
  assert.match(source, /lane: 'rigging'/);
  assert.match(source, /coherent source-safe survivor/);
});

test('decision packet requires exactly one human stack decision', () => {
  assert.match(source, /acceptableDecisions: \['primary', 'counterSway', 'breath', 'reject-all'\]/);
  assert.match(source, /watch the normal-speed videos/i);
  assert.match(source, /receiptTemplate/);
});
