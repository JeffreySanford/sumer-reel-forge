import axios from 'axios';

const shotThreeRequest = {
  provider: 'deterministic',
  shotId: 'enki-at-the-helm',
  storyFunction: 'Establish Enki as the visual anchor of the voyage.',
  emotionalPurpose: 'calm authority',
  eyeTarget: 'enki-face',
  stillnessAnchor: 'enki-facial-identity',
  styleRules: [
    'character-closeup.camera.maxPushPercent = 3',
    'narratorOnly.lipSync = false',
  ],
  constraints: ['Use one primary movement.'],
  availableAssets: [
    'assets/blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-03.png',
  ],
};

describe('POST /api/planning/shot-plan', () => {
  it('creates a deterministic human-review planning scaffold without Ollama', async () => {
    const res = await axios.post(`/api/planning/shot-plan`, shotThreeRequest);

    expect(res.status).toBe(201);
    expect(res.data).toMatchObject({
      provider: 'deterministic',
      shotId: 'enki-at-the-helm',
      status: 'scaffold',
      eyeTarget: 'enki-face',
      stillnessAnchor: 'enki-facial-identity',
      camera: {
        preset: 'human-review-required',
        scaleFrom: 1,
        scaleTo: 1,
      },
    });
    expect(res.data.inheritedStyleRules).toContain(
      'character-closeup.camera.maxPushPercent = 3',
    );
  });
});

describe('planning run persistence', () => {
  it('preserves model output, human edits, server guardrails, and approval history', async () => {
    const created = await axios.post('/api/planning/runs', {
      ...shotThreeRequest,
      projectSlug: 'blessings-of-sumer',
      chapterNumber: 1,
      episodeNumber: 1,
      shotNumber: 3,
    });

    expect(created.status).toBe(201);
    expect(created.data).toMatchObject({
      shotNumber: 3,
      shotKey: 'enki-at-the-helm',
      provider: 'deterministic',
      promptVersion: 'shot-plan-v1',
      status: 'proposal-ready',
    });
    expect(created.data.inputHash).toHaveLength(64);
    expect(created.data.outputHash).toHaveLength(64);
    expect(created.data.workingHash).toBe(created.data.outputHash);
    expect(created.data.proposal).toEqual(created.data.workingProposal);

    const latest = await axios.get('/api/planning/runs/latest', {
      params: {
        projectSlug: 'blessings-of-sumer',
        chapterNumber: 1,
        episodeNumber: 1,
        shotNumber: 3,
      },
    });
    expect(latest.data.id).toBe(created.data.id);

    const tooAggressive = {
      ...created.data.workingProposal,
      camera: {
        ...created.data.workingProposal.camera,
        scaleFrom: 1,
        scaleTo: 1.04,
      },
    };
    const invalidEdit = await axios.patch(
      `/api/planning/runs/${created.data.id}/proposal`,
      { proposal: tooAggressive },
    );

    expect(invalidEdit.data.outputHash).toBe(created.data.outputHash);
    expect(invalidEdit.data.workingHash).not.toBe(created.data.outputHash);
    expect(invalidEdit.data.workingProposal.camera.scaleTo).toBe(1.04);

    await expect(
      axios.patch(`/api/planning/runs/${created.data.id}/review`, {
        decision: 'approved',
      }),
    ).rejects.toMatchObject({ response: { status: 400 } });

    const corrected = {
      ...invalidEdit.data.workingProposal,
      camera: {
        ...invalidEdit.data.workingProposal.camera,
        preset: 'character-closeup',
        scaleFrom: 1,
        scaleTo: 1.02,
        easing: 'cinematicSlow',
      },
      motionBudget: {
        ...invalidEdit.data.workingProposal.motionBudget,
        primary: 'slow-push',
      },
    };
    const validEdit = await axios.patch(
      `/api/planning/runs/${created.data.id}/proposal`,
      { proposal: corrected },
    );
    expect(validEdit.data.workingProposal.camera.scaleTo).toBe(1.02);

    const approved = await axios.patch(
      `/api/planning/runs/${created.data.id}/review`,
      {
        decision: 'approved',
        notes: 'API e2e approved after restoring the Shot 3 camera limit.',
      },
    );

    expect(approved.data).toMatchObject({
      id: created.data.id,
      status: 'approved',
      reviewedBy: 'local-director',
      reviewNotes:
        'API e2e approved after restoring the Shot 3 camera limit.',
    });
    expect(approved.data.reviewedAt).toBeTruthy();

    const persisted = await axios.get('/api/planning/runs/latest', {
      params: {
        projectSlug: 'blessings-of-sumer',
        chapterNumber: 1,
        episodeNumber: 1,
        shotNumber: 3,
      },
    });
    expect(persisted.data).toMatchObject({
      id: created.data.id,
      status: 'approved',
      outputHash: created.data.outputHash,
      workingHash: validEdit.data.workingHash,
    });
  });
});
