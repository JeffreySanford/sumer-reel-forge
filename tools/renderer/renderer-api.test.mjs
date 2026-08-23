import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RendererApi } from './renderer-api.mjs';

test('claimJob returns null when the API returns an empty successful body', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('', { status: 201 });

  try {
    const api = new RendererApi('http://localhost:3000/api', 'test-worker');
    assert.equal(await api.claimJob(), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('claimJob parses a queued job response', async () => {
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

test('request preserves an actionable error for malformed non-empty JSON', async () => {
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
