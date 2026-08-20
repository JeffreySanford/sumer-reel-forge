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

  it('returns expanded production storyboards for every reel', async () => {
    const episodes = await Promise.all(
      Array.from({ length: 18 }, (_, index) =>
        axios.get(`/api/chapters/1/reels/${index + 1}`),
      ),
    );

    expect(episodes.every(({ data }) => data.shots.length >= 6)).toBe(true);
    expect(
      episodes.every(
        ({ data }) =>
          data.shots.reduce(
            (total: number, shot: { durationSeconds: number }) =>
              total + shot.durationSeconds,
            0,
          ) === data.targetDurationSeconds,
      ),
    ).toBe(true);
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

    await axios.patch(
      `/api/chapters/1/reels/1/production`,
      {
        logline: episode.data.logline,
        narration: episode.data.narration,
        onScreenText: episode.data.onScreenText,
        shots: episode.data.shots,
        musicDirection: episode.data.musicDirection,
        voiceDirection: episode.data.voiceDirection,
        platformNotes: episode.data.platformNotes,
        exportMetadata: episode.data.exportMetadata,
      },
      { headers: { 'x-request-id': 'api-e2e-production-restore' } },
    );
  });
});

describe('render job workflow', () => {
  it('claims, heartbeats, records assets, and marks stale jobs', async () => {
    await axios.post(`/api/render-jobs/watchdog/stale`, null, {
      params: { maxAgeSeconds: 0 },
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

    const attempts = await axios.get(
      `/api/render-jobs/${queued.data.id}/attempts`,
    );
    expect(attempts.data).toEqual([
      expect.objectContaining({
        attemptNumber: 1,
        workerId: 'api-e2e-worker',
        status: 'running',
      }),
    ]);

    await axios.post(`/api/render-jobs/${queued.data.id}/logs`, {
      workerId: 'api-e2e-worker',
      level: 'info',
      stream: 'stdout',
      message: 'API e2e renderer output',
    });
    const logs = await axios.get(`/api/render-jobs/${queued.data.id}/logs`);
    expect(logs.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: 'API e2e renderer output' }),
      ]),
    );

    const asset = await axios.post(`/api/generated-assets`, {
      renderJobId: queued.data.id,
      assetType: 'manifest',
      uri: 'file:///tmp/api-e2e-manifest.json',
      metadata: { test: true },
      shotNumber: 1,
    });

    expect(asset.status).toBe(201);
    expect(asset.data).toMatchObject({
      renderJobId: queued.data.id,
      assetType: 'manifest',
      uri: 'file:///tmp/api-e2e-manifest.json',
      shotNumber: 1,
      reviewStatus: 'pending',
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

    const reviewed = await axios.patch(
      `/api/generated-assets/${asset.data.id}/review`,
      {
        status: 'rejected',
        notes: 'Continuity mismatch in API e2e.',
        reviewer: 'api-e2e-reviewer',
      },
    );
    expect(reviewed.data).toMatchObject({
      reviewStatus: 'rejected',
      reviewNotes: 'Continuity mismatch in API e2e.',
      reviewedBy: 'api-e2e-reviewer',
    });

    const stale = await axios.post(`/api/render-jobs/watchdog/stale`, null, {
      params: { maxAgeSeconds: 0 },
    });

    expect(stale.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: queued.data.id,
          status: 'failed',
        }),
      ]),
    );

    const retry = await axios.post(`/api/render-jobs/${queued.data.id}/retry`, {
      notes: 'Retry from API e2e.',
    });
    expect(retry.data).toMatchObject({
      id: queued.data.id,
      status: 'queued',
      attemptCount: 1,
    });

    await axios.post(`/api/render-jobs/watchdog/stale`, null, {
      params: { maxAgeSeconds: 0 },
    });
  });
});

describe('reel approval workflow', () => {
  it('requires approval before queueing a final video', async () => {
    await expect(
      axios.post(`/api/render-jobs`, {
        episodeId: 1,
        mode: 'final-video',
      }),
    ).rejects.toMatchObject({ response: { status: 409 } });

    const review = await axios.patch(`/api/chapters/1/reels/1/status`, {
      status: 'review',
    });
    expect(review.data.productionStatus).toBe('review');

    const approved = await axios.patch(`/api/chapters/1/reels/1/status`, {
      status: 'approved',
    });
    expect(approved.data.productionStatus).toBe('approved');

    const finalJob = await axios.post(`/api/render-jobs`, {
      episodeId: 1,
      mode: 'final-video',
      notes: 'Approval-gated API e2e final.',
    });
    expect(finalJob.data.status).toBe('queued');

    const rendering = await axios.get(`/api/chapters/1/reels/1`);
    expect(rendering.data.productionStatus).toBe('rendering');

    await axios.post(`/api/render-jobs/watchdog/stale`, null, {
      params: { maxAgeSeconds: 0 },
    });
    const reset = await axios.get(`/api/chapters/1/reels/1`);
    expect(reset.data.productionStatus).toBe('approved');

    const draft = await axios.patch(`/api/chapters/1/reels/1/status`, {
      status: 'draft',
      notes: 'Restore local development state after API e2e.',
    });
    expect(draft.data.productionStatus).toBe('draft');
  });
});
