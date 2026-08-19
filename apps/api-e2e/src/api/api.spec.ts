import axios from 'axios';

describe('GET /api/health', () => {
  it('returns API health', async () => {
    const res = await axios.get(`/api/health`);

    expect(res.status).toBe(200);
    expect(res.data).toEqual({
      status: 'ok',
      service: 'sumer-reel-forge-api',
    });
  });
});

describe('GET /api/chapters/1/reels', () => {
  it('returns the full Chapter 1 reel outline', async () => {
    const res = await axios.get(`/api/chapters/1/reels`);

    expect(res.status).toBe(200);
    expect(res.data).toHaveLength(18);
    expect(res.data[0]).toMatchObject({
      episode: 1,
      title: 'The Voyage Begins',
    });
  });
});

describe('PATCH /api/chapters/1/reels/:episodeId/production', () => {
  it('saves editable production fields', async () => {
    const episode = await axios.get(`/api/chapters/1/reels/1`);
    const res = await axios.patch(
      `/api/chapters/1/reels/1/production`,
      {
        logline: 'Updated e2e logline.',
        narration: 'Updated e2e narration.',
        onScreenText: episode.data.onScreenText,
        shots: episode.data.shots,
        musicDirection: 'Updated e2e music direction.',
        voiceDirection: 'Updated e2e voice direction.',
        platformNotes: ['Updated e2e platform note.'],
        exportMetadata: {
          facebookCaption: 'Updated Facebook caption.',
          xPost: 'Updated X post.',
          tiktokCaption: 'Updated TikTok caption.',
          youtubeShortsTitle: 'Updated Shorts title',
          tags: ['e2e', 'sumer'],
        },
      },
      {
        headers: {
          'x-request-id': 'api-e2e-production-save',
        },
      },
    );

    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({
      episode: 1,
      logline: 'Updated e2e logline.',
      platformNotes: ['Updated e2e platform note.'],
      exportMetadata: {
        xPost: 'Updated X post.',
      },
    });
  });
});

describe('render job workflow', () => {
  it('claims, heartbeats, records assets, and marks stale jobs', async () => {
    await axios.post(`/api/render-jobs/watchdog/stale`, null, {
      params: { maxAgeSeconds: -1 },
    });

    const queued = await axios.post(`/api/render-jobs`, {
      episodeId: 1,
      mode: 'storyboard',
      notes: 'API e2e queued job',
    });

    const claimed = await axios.post(`/api/render-jobs/claim`, {
      workerId: 'api-e2e-worker',
    });

    expect(claimed.status).toBe(201);
    expect(claimed.data).toMatchObject({
      id: queued.data.id,
      status: 'running',
      workerId: 'api-e2e-worker',
      attemptCount: 1,
    });

    const heartbeat = await axios.patch(
      `/api/render-jobs/${queued.data.id}/heartbeat`,
      { notes: 'API e2e heartbeat' },
    );

    expect(heartbeat.data.status).toBe('running');
    expect(heartbeat.data.heartbeatAt).toBeTruthy();

    const asset = await axios.post(`/api/generated-assets`, {
      renderJobId: queued.data.id,
      assetType: 'manifest',
      uri: 'file:///tmp/api-e2e-manifest.json',
      metadata: { test: true },
    });

    expect(asset.status).toBe(201);
    expect(asset.data).toMatchObject({
      renderJobId: queued.data.id,
      assetType: 'manifest',
      uri: 'file:///tmp/api-e2e-manifest.json',
    });

    const assets = await axios.get(
      `/api/generated-assets?renderJobId=${queued.data.id}`,
    );

    expect(assets.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: asset.data.id,
          renderJobId: queued.data.id,
        }),
      ]),
    );

    const stale = await axios.post(`/api/render-jobs/watchdog/stale`, null, {
      params: { maxAgeSeconds: -1 },
    });

    expect(stale.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: queued.data.id,
          status: 'failed',
        }),
      ]),
    );
  });
});
