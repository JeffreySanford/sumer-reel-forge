import { buildSceneInspection } from '@sumer-reel-forge/animation-inspection';
import { GOLDEN_INSPECTION_FIXTURE } from './golden-inspection.fixture';
import { FakeRuntimePreviewAdapter } from './runtime-preview';

describe('FakeRuntimePreviewAdapter', () => {
  it('evaluates the resolved fake runtimes at an exact frame and composes parent motion', () => {
    const adapter = new FakeRuntimePreviewAdapter();
    const inspection = buildSceneInspection(GOLDEN_INSPECTION_FIXTURE, 101);

    const model = adapter.evaluate({ fixture: GOLDEN_INSPECTION_FIXTURE, inspection });

    expect(model.frame).toBe(101);
    expect(model.proofState).toBe('BLINK_CLOSED');
    expect(model.evaluatedRuntimeCount).toBe(4);
    expect(model.nodes).toHaveLength(3);
    expect(model.nodes.find((node) => node.id === 'prop:stag-of-absu')?.x).toBeCloseTo(6.02);
    expect(model.nodes.find((node) => node.id === 'actor-instance:enki:s03')?.x).toBeCloseTo(7.03);
  });

  it('re-evaluates the same authored runtime definitions at frame zero', () => {
    const adapter = new FakeRuntimePreviewAdapter();
    const inspection = buildSceneInspection(GOLDEN_INSPECTION_FIXTURE, 0);

    const model = adapter.evaluate({ fixture: GOLDEN_INSPECTION_FIXTURE, inspection });

    expect(model.proofState).toBe('START');
    expect(model.nodes.find((node) => node.id === 'prop:stag-of-absu')?.x).toBe(4);
    expect(model.nodes.find((node) => node.id === 'actor-instance:enki:s03')?.x).toBe(4);
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
});