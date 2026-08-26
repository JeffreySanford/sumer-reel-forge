import { buildSceneInspection } from '@sumer-reel-forge/animation-inspection';
import { GOLDEN_INSPECTION_FIXTURE } from './golden-inspection.fixture';
import { FakeRuntimePreviewAdapter } from './runtime-preview';

describe('FakeRuntimePreviewAdapter', () => {
  it('evaluates exact-frame local and composed transforms with parent diagnostics', () => {
    const adapter = new FakeRuntimePreviewAdapter();
    const inspection = buildSceneInspection(GOLDEN_INSPECTION_FIXTURE, 101);

    const model = adapter.evaluate({ fixture: GOLDEN_INSPECTION_FIXTURE, inspection });
    const stag = model.nodes.find((node) => node.id === 'prop:stag-of-absu');
    const enki = model.nodes.find((node) => node.id === 'actor-instance:enki:s03');

    expect(model.frame).toBe(101);
    expect(model.proofState).toBe('BLINK_CLOSED');
    expect(model.evaluatedRuntimeCount).toBe(4);
    expect(model.nodes).toHaveLength(3);
    expect(stag?.localX).toBeCloseTo(6.02);
    expect(stag?.x).toBeCloseTo(6.02);
    expect(stag?.parentChain).toEqual([]);
    expect(enki?.localX).toBeCloseTo(1.01);
    expect(enki?.x).toBeCloseTo(7.03);
    expect(enki?.parentId).toBe('prop:stag-of-absu');
    expect(enki?.parentChain).toEqual(['prop:stag-of-absu']);
    expect(enki?.capabilities).toEqual(['2d-transform', 'world-state']);
  });

  it('re-evaluates the same authored runtime definitions at frame zero', () => {
    const adapter = new FakeRuntimePreviewAdapter();
    const inspection = buildSceneInspection(GOLDEN_INSPECTION_FIXTURE, 0);

    const model = adapter.evaluate({ fixture: GOLDEN_INSPECTION_FIXTURE, inspection });
    const enki = model.nodes.find((node) => node.id === 'actor-instance:enki:s03');

    expect(model.proofState).toBe('START');
    expect(model.nodes.find((node) => node.id === 'prop:stag-of-absu')?.x).toBe(4);
    expect(enki?.localX).toBe(0);
    expect(enki?.x).toBe(4);
  });

  it('exposes viewport and evidence binding diagnostics from the resolved scene', () => {
    const adapter = new FakeRuntimePreviewAdapter();
    const inspection = buildSceneInspection(GOLDEN_INSPECTION_FIXTURE, 101);

    const model = adapter.evaluate({ fixture: GOLDEN_INSPECTION_FIXTURE, inspection });

    expect(model.viewport).toEqual({
      width: 1080,
      height: 1920,
      aspectRatio: 0.5625,
      aspectRatioLabel: '9:16',
    });
    expect(model.evidence).toMatchObject({
      status: 'BOUND',
      historicalSourceCount: 2,
      visualEvidenceCount: 1,
      assetCount: 3,
      sourceSceneHash: GOLDEN_INSPECTION_FIXTURE.sourceSceneHash,
      resolvedSceneHash: GOLDEN_INSPECTION_FIXTURE.resolvedSceneHash,
    });
  });

  it('marks preview evidence stale when the fixture hash diverges from the inspected receipt', () => {
    const adapter = new FakeRuntimePreviewAdapter();
    const inspection = buildSceneInspection(GOLDEN_INSPECTION_FIXTURE, 101);
    const fixture = {
      ...GOLDEN_INSPECTION_FIXTURE,
      resolvedSceneHash: 'sha256:stale-preview-receipt',
    };

    const model = adapter.evaluate({ fixture, inspection });

    expect(model.evidence?.status).toBe('STALE');
  });

  it('is deterministic for repeated evaluation of the same resolved frame', () => {
    const adapter = new FakeRuntimePreviewAdapter();
    const inspection = buildSceneInspection(GOLDEN_INSPECTION_FIXTURE, 101);

    const first = adapter.evaluate({ fixture: GOLDEN_INSPECTION_FIXTURE, inspection });
    const second = adapter.evaluate({ fixture: GOLDEN_INSPECTION_FIXTURE, inspection });

    expect(second).toEqual(first);
  });

  it('refuses a runtime family the fake preview adapter cannot evaluate', () => {
    const adapter = new FakeRuntimePreviewAdapter();
    const fixture = {
      ...GOLDEN_INSPECTION_FIXTURE,
      runtimes: GOLDEN_INSPECTION_FIXTURE.runtimes.map((runtime, index) =>
        index === 0 ? { ...runtime, runtime: 'pixi' } : runtime,
      ),
    };
    const inspection = buildSceneInspection(fixture, 101);

    expect(() => adapter.evaluate({ fixture, inspection })).toThrow(
      /cannot evaluate pixi@1\.0\.0/i,
    );
  });

  it('requires the authored scene seed from the resolved semantic scene', () => {
    const adapter = new FakeRuntimePreviewAdapter();
    const semanticScene = {
      ...(GOLDEN_INSPECTION_FIXTURE.semanticScene as Record<string, unknown>),
    };
    delete semanticScene['seed'];
    const fixture = { ...GOLDEN_INSPECTION_FIXTURE, semanticScene };
    const inspection = buildSceneInspection(fixture, 101);

    expect(() => adapter.evaluate({ fixture, inspection })).toThrow(/integer scene seed/i);
  });

  it('refuses a parent binding that has no evaluated runtime state', () => {
    const adapter = new FakeRuntimePreviewAdapter();
    const baseScene = GOLDEN_INSPECTION_FIXTURE.semanticScene as Record<string, unknown>;
    const actors = (baseScene['actors'] as readonly Record<string, unknown>[]).map((actor) => ({
      ...actor,
      transform: { parentId: 'prop:missing-parent' },
    }));
    const fixture = {
      ...GOLDEN_INSPECTION_FIXTURE,
      semanticScene: { ...baseScene, actors },
    };
    const inspection = buildSceneInspection(fixture, 101);

    expect(() => adapter.evaluate({ fixture, inspection })).toThrow(
      /parent prop:missing-parent.*no evaluated runtime state/i,
    );
  });
});
