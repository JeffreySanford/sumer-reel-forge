import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RendererApi } from './renderer-api.mjs';
import { boundedStatusNote } from './status-utils.mjs';

test('preserves status notes within the DTO limit', () => {
  assert.equal(boundedStatusNote('concise failure'), 'concise failure');
});

test('trims verbose failures to the exact DTO limit', () => {
  const note = boundedStatusNote('x'.repeat(1200));

  assert.equal(note.length, 1000);
  assert.match(note, /\.\.\. \[trimmed\]$/);
});

test('renderer claim returns null when the API queue is empty', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('', { status: 201 });

  try {
    const api = new RendererApi('http://localhost:3000/api', 'test-worker');
    assert.equal(await api.claimJob(), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('renderer claim parses a queued job response', async () => {
  const originalFetch = globalThis.fetch;
  const queuedJob = {
    id: 'job-1',
    episodeId: 1,
    mode: 'draft-video',
    status: 'running',
  };
  globalThis.fetch = async () =>
    new Response(JSON.stringify(queuedJob), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });

  try {
    const api = new RendererApi('http://localhost:3000/api', 'test-worker');
    assert.deepEqual(await api.claimJob(), queuedJob);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('renderer request reports malformed non-empty JSON clearly', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('{', { status: 200 });

  try {
    const api = new RendererApi('http://localhost:3000/api', 'test-worker');
    await assert.rejects(
      () => api.request('/render-jobs/claim', { operation: 'claim' }),
      /claim returned invalid JSON/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
