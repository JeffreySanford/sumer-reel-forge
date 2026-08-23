import assert from 'node:assert/strict';
import test from 'node:test';
import { formatRemotionPhaseMetrics } from './remotion-shared-render';

test('formats Remotion render/encode phase timings for diagnostics', () => {
  assert.equal(
    formatRemotionPhaseMetrics({
      totalDurationMs: 12500,
      renderedDoneInMs: 9200,
      encodedDoneInMs: 10300,
      resolvedConcurrency: 8,
      parallelEncoding: true,
    }),
    'render 9.2s, encode 10.3s, total 12.5s, concurrency 8, parallel encode yes',
  );
});

test('formats unavailable phase data without guessing', () => {
  assert.equal(
    formatRemotionPhaseMetrics({
      totalDurationMs: 4000,
      renderedDoneInMs: null,
      encodedDoneInMs: null,
      resolvedConcurrency: null,
      parallelEncoding: null,
    }),
    'render n/a, encode n/a, total 4.0s, concurrency n/a, parallel encode n/a',
  );
});
