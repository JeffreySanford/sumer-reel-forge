import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boundedStatusNote } from './status-utils.mjs';

test('preserves status notes within the DTO limit', () => {
  assert.equal(boundedStatusNote('concise failure'), 'concise failure');
});

test('trims verbose failures to the exact DTO limit', () => {
  const note = boundedStatusNote('x'.repeat(1200));

  assert.equal(note.length, 1000);
  assert.match(note, /\.\.\. \[trimmed\]$/);
});
