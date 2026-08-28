import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { ForgeMotionProposalService } from './forge-motion-proposal.service';

function productionFixture() {
  return {
    schemaVersion: 1,
    observedAt: '2026-08-28T19:00:00.000Z',
    principle: 'AI proposes. Rules constrain. Human directs.',
    manifestId: 'reel-01-animation-v1',
    manifestPath: 'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
    projectSlug: 'blessings-of-sumer',
    chapterNumber: 1,
    episodeNumber: 1,
    assetVersion: 'animation-v1',
    sourceEditorialVersion: 'editorial-v1',
    laneRegistryId: 'production-lanes-v1',
    styleDecisionLibraryId: 'style-decisions-v1',
    summary: {
      shotCount: 1,
      layeredReadyCount: 1,
      approvedRequiredLayerCount: 1,
      requiredLayerCount: 1,
    },
    shots: [
      {
        sourceShotNumber: 3,
        shotId: 'enki-at-the-helm',
        status: 'approved',
        sourceFrame: 'chapter-01/reel-01/shot-03.png',
        activationState: 'layered-ready',
        requiredLayerCount: 1,
        readyRequiredLayerCount: 1,
        optionalLayerCount: 0,
        deferredPerformanceEnabled: false,
        fallbackAssetPath: null,
        sourceDimensions: { width: 1080, height: 1920 },
        layers: [
          {
            id: 'shot03-enki-body-v1',
            path: 'chapter-01/reel-01/animation-v1/shot03-enki-body-v1.png',
            role: 'character',
            material: 'cloth-heavy',
            required: true,
            hasAlpha: true,
            motionPresets: ['breathing'],
            state: 'approved',
            reviewStatus: 'approved',
            reviewNotes: ['QA PASS'],
            qaEvidenceRecorded: true,
            coverageAdvisory: null,
            fileExists: true,
            dimensions: { width: 1080, height: 1920 },
            sourceDimensions: { width: 1080, height: 1920 },
            dimensionsMatchSource: true,
            sha256: 'a'.repeat(64),
            checksumMatches: true,
            ready: true,
            lane: {
              id: 'character-source-extraction',
              generatorFamily: 'source-preservation',
              qaFamily: 'identity-motion',
              notes: [],
            },
            decisions: [],
          },
        ],
        decisions: [
          {
            id: 'shot3-approved-stillness-anchor',
            state: 'approved',
            scopeType: 'shot',
            path: 'composition.stillnessAnchor',
            value: 'enki-facial-identity',
            rationale: 'Identity remains stable.',
          },
        ],
      },
    ],
  };
}

function providerFixture() {
  return {
    id: 'ollama' as const,
    getCapability: jest.fn().mockResolvedValue({
      id: 'ollama',
      available: true,
      text: true,
      structuredOutput: true,
      configuredModel: 'qwen3:8b',
    }),
    chat: jest.fn().mockResolvedValue({
      provider: 'ollama',
      model: 'qwen3:8b',
      content: JSON.stringify({
        summary: 'Keep the vessel heavy and Enki restrained.',
        parameters: {
          vesselHeave: 1.4,
          vesselRoll: -0.2,
          enkiCounterSway: 0.55,
          cameraPush: 0.25,
          forbiddenExtraMotion: 0.9,
        },
        rationale: {
          vesselHeave: 'Heavy low-frequency movement.',
          vesselRoll: 'Very small roll.',
          enkiCounterSway: 'Planted compensation.',
          cameraPush: 'Restrained emphasis.',
          forbiddenExtraMotion: 'Must be ignored.',
        },
      }),
    }),
  };
}

function workspaceRoot(): string {
  let current = process.cwd();
  while (true) {
    if (existsSync(resolve(current, 'nx.json')) && existsSync(resolve(current, 'package.json'))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) throw new Error('Unable to locate workspace root in Forge persistence test.');
    current = parent;
  }
}

describe('ForgeMotionProposalService', () => {
  it('uses canonical shot context, clamps values, and drops unknown channels', async () => {
    const provider = providerFixture();
    const localAi = {
      getProvider: jest.fn().mockReturnValue(provider),
    };
    const productionStatus = {
      getStatus: jest.fn().mockResolvedValue(productionFixture()),
    };

    const service = new ForgeMotionProposalService(
      localAi as never,
      productionStatus as never,
    );
    const result = await service.propose({ shot: 3 });

    expect(result.state).toBe('proposal');
    expect(result.provider).toBe('ollama');
    expect(result.model).toBe('qwen3:8b');
    expect(result.canonicalFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(result.parameters.map((parameter) => parameter.id)).toEqual([
      'vesselHeave',
      'vesselRoll',
      'enkiCounterSway',
      'cameraPush',
    ]);
    expect(result.parameters.map((parameter) => parameter.value)).toEqual([
      1,
      0,
      0.55,
      0.25,
    ]);
    expect(JSON.stringify(result)).not.toContain('forbiddenExtraMotion');
    expect(result.guardrails).toContain(
      'No proposal may promote or mutate animation-v1.',
    );
    expect(provider.chat).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 'react-forge-lab',
        task: 'forge-motion-proposal-shot-3',
        model: 'qwen3:8b',
        keepAlive: '0s',
      }),
    );
  });

  it('persists only explicit human working state as non-canonical review evidence', async () => {
    const provider = providerFixture();
    const production = productionFixture();
    const productionStatus = {
      getStatus: jest.fn().mockResolvedValue(production),
    };
    const service = new ForgeMotionProposalService(
      { getProvider: jest.fn().mockReturnValue(provider) } as never,
      productionStatus as never,
    );
    const proposal = await service.propose({
      shot: 3,
      direction: 'Make the vessel feel heavier.',
    });

    const accepted = await service.acceptForReview({
      proposal: proposal as unknown as Record<string, unknown>,
      workingParameters: {
        vesselHeave: 0.81,
        vesselRoll: 0.18,
        enkiCounterSway: 0.4,
        cameraPush: 0.2,
      },
      direction: 'Make the vessel feel heavier.',
    });

    expect(accepted.state).toBe('accepted-for-review');
    expect(accepted.review).toEqual({
      deterministicQa: 'pending',
      humanReview: 'required',
      promotion: 'not-requested',
    });
    expect(accepted.evidencePath).toMatch(/^tmp\/forge-proposals\/shot-3-.+\.json$/);
    expect(accepted.workingParameters.map((parameter) => parameter.value)).toEqual([
      0.81,
      0.18,
      0.4,
      0.2,
    ]);

    const absolutePath = resolve(workspaceRoot(), accepted.evidencePath);
    const persisted = JSON.parse(await readFile(absolutePath, 'utf8')) as {
      state: string;
      evidencePath?: string;
      proposal: { id: string };
      review: { promotion: string };
    };
    expect(persisted.state).toBe('accepted-for-review');
    expect(persisted.proposal.id).toBe(proposal.id);
    expect(persisted.review.promotion).toBe('not-requested');
    expect(persisted.evidencePath).toBeUndefined();
    await rm(absolutePath, { force: true });
  });

  it('fails closed when canonical production state changed before acceptance', async () => {
    const provider = providerFixture();
    const original = productionFixture();
    const changed = {
      ...productionFixture(),
      assetVersion: 'animation-v1-changed',
      observedAt: '2026-08-28T19:10:00.000Z',
    };
    const productionStatus = {
      getStatus: jest
        .fn()
        .mockResolvedValueOnce(original)
        .mockResolvedValueOnce(changed),
    };
    const service = new ForgeMotionProposalService(
      { getProvider: jest.fn().mockReturnValue(provider) } as never,
      productionStatus as never,
    );
    const proposal = await service.propose({ shot: 3 });

    await expect(
      service.acceptForReview({
        proposal: proposal as unknown as Record<string, unknown>,
        workingParameters: {
          vesselHeave: 0.8,
          vesselRoll: 0.2,
          enkiCounterSway: 0.4,
          cameraPush: 0.2,
        },
      }),
    ).rejects.toThrow('canonical production state changed');
  });

  it('rejects unknown working-state channels before persistence', async () => {
    const provider = providerFixture();
    const productionStatus = {
      getStatus: jest.fn().mockResolvedValue(productionFixture()),
    };
    const service = new ForgeMotionProposalService(
      { getProvider: jest.fn().mockReturnValue(provider) } as never,
      productionStatus as never,
    );
    const proposal = await service.propose({ shot: 3 });

    await expect(
      service.acceptForReview({
        proposal: proposal as unknown as Record<string, unknown>,
        workingParameters: {
          vesselHeave: 0.8,
          vesselRoll: 0.2,
          enkiCounterSway: 0.4,
          cameraPush: 0.2,
          forbiddenExtraMotion: 0.9,
        },
      }),
    ).rejects.toThrow('unknown motion channels');
  });

  it('rejects providers that are unavailable for managed text inference', async () => {
    const localAi = {
      getProvider: jest.fn().mockReturnValue({
        getCapability: jest.fn().mockResolvedValue({
          id: 'ollama',
          available: false,
          text: false,
          structuredOutput: true,
        }),
      }),
    };
    const service = new ForgeMotionProposalService(
      localAi as never,
      { getStatus: jest.fn() } as never,
    );

    await expect(service.propose({ shot: 4 })).rejects.toThrow(
      "Local AI provider 'ollama' is not available for text inference.",
    );
  });
});
