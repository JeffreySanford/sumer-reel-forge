import { buildSceneInspection } from '@sumer-reel-forge/animation-inspection';
import {
  buildPixiApplicationOptions,
  PIXI_PREVIEW_RENDER_MODE,
} from '@sumer-reel-forge/animation-pixi';
import { GOLDEN_INSPECTION_FIXTURE } from './golden-inspection.fixture';
import { buildPixiPreviewPlan } from './pixi-preview-plan';
import { FakeRuntimePreviewAdapter } from './runtime-preview';
import { SHOT03_SOURCE_BACKED_ASSETS, SHOT03_WATER_SHA256 } from './shot03-source-backed-asset';
import { SHOT03_WATER_MATERIAL_BINDINGS } from './shot03-water-material';

const GOLDEN_TIMING = Object.freeze({ fps: 30, durationFrames: 210 });

describe('buildPixiPreviewPlan', () => {
  it('builds an artwork-first visual-review plan from the approved Shot 3 layers', () => {
    const adapter = new FakeRuntimePreviewAdapter();
    const inspection = buildSceneInspection(GOLDEN_INSPECTION_FIXTURE, 101);
    const model = adapter.evaluate({ fixture: GOLDEN_INSPECTION_FIXTURE, inspection });

    const plan = buildPixiPreviewPlan(model, 1080, 1920, SHOT03_SOURCE_BACKED_ASSETS);
    const water = plan.sourceAssets.find((asset) => asset.id === 'shot03-water-v1');

    expect(plan.frame).toBe(101);
    expect(plan.width).toBe(1080);
    expect(plan.height).toBe(1920);
    expect(model.nodes).toHaveLength(3);
    expect(plan.nodeCount).toBe(0);
    expect(plan.nodes).toEqual([]);
    expect(plan.materials).toEqual([]);
    expect(plan.sourceAssets.map((asset) => asset.id)).toEqual([
      'shot03-background-v1',
      'shot03-water-v1',
      'shot03-vessel-v1',
      'shot03-enki-body-v1',
    ]);
    expect(water).toMatchObject({
      id: 'shot03-water-v1',
      role: 'water',
      sha256: SHOT03_WATER_SHA256,
      width: 941,
      height: 1672,
      registration: 'cover-center',
    });
  });

  it('can explicitly include projected diagnostic geometry without changing source identity', () => {
    const adapter = new FakeRuntimePreviewAdapter();
    const inspection = buildSceneInspection(GOLDEN_INSPECTION_FIXTURE, 101);
    const model = adapter.evaluate({ fixture: GOLDEN_INSPECTION_FIXTURE, inspection });

    const plan = buildPixiPreviewPlan(
      model,
      1080,
      1920,
      SHOT03_SOURCE_BACKED_ASSETS,
      [],
      undefined,
      true,
    );
    const enki = plan.nodes.find((node) => node.id === 'actor-instance:enki:s03');

    expect(plan.nodeCount).toBe(3);
    expect(enki?.x).toBeCloseTo(661.068);
    expect(enki?.y).toBeCloseTo(782.837);
    expect(plan.sourceAssets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'shot03-water-v1', sha256: SHOT03_WATER_SHA256 }),
      ]),
    );
  });

  it('projects the bounded Shot 3 water material from the same exact frame', () => {
    const adapter = new FakeRuntimePreviewAdapter();
    const inspection = buildSceneInspection(GOLDEN_INSPECTION_FIXTURE, 101);
    const model = adapter.evaluate({ fixture: GOLDEN_INSPECTION_FIXTURE, inspection });

    const plan = buildPixiPreviewPlan(
      model,
      1080,
      1920,
      SHOT03_SOURCE_BACKED_ASSETS,
      SHOT03_WATER_MATERIAL_BINDINGS,
      GOLDEN_TIMING,
    );

    expect(plan.nodeCount).toBe(0);
    expect(plan.materials).toHaveLength(1);
    expect(plan.materials[0]).toMatchObject({
      id: 'shot03-water-micro-drift-v1',
      assetId: 'shot03-water-v1',
      kind: 'contained-water-micro-drift',
      containment: 'source-alpha',
      timeSource: 'exact-frame',
      maxOffsetX: 2.4,
      maxOffsetY: 1.2,
      maxScale: 1.006,
      settle: 1,
    });
    expect(plan.materials[0]?.offsetX).toBeCloseTo(0.5, 9);
    expect(plan.materials[0]?.offsetY).toBeCloseTo(-1.1272727273, 9);
  });

  it('changes diagnostic geometry and material state only when the exact runtime frame changes', () => {
    const adapter = new FakeRuntimePreviewAdapter();
    const frameZero = buildSceneInspection(GOLDEN_INSPECTION_FIXTURE, 0);
    const frame101 = buildSceneInspection(GOLDEN_INSPECTION_FIXTURE, 101);

    const start = buildPixiPreviewPlan(
      adapter.evaluate({ fixture: GOLDEN_INSPECTION_FIXTURE, inspection: frameZero }),
      1080,
      1920,
      SHOT03_SOURCE_BACKED_ASSETS,
      SHOT03_WATER_MATERIAL_BINDINGS,
      GOLDEN_TIMING,
      true,
    );
    const blink = buildPixiPreviewPlan(
      adapter.evaluate({ fixture: GOLDEN_INSPECTION_FIXTURE, inspection: frame101 }),
      1080,
      1920,
      SHOT03_SOURCE_BACKED_ASSETS,
      SHOT03_WATER_MATERIAL_BINDINGS,
      GOLDEN_TIMING,
      true,
    );

    expect(start.nodes.find((node) => node.id === 'actor-instance:enki:s03')?.x).toBeCloseTo(432);
    expect(blink.nodes.find((node) => node.id === 'actor-instance:enki:s03')?.x).toBeCloseTo(661.068);
    expect(start.sourceAssets).toEqual(blink.sourceAssets);
    expect(start.materials[0]?.offsetX).toBe(0);
    expect(start.materials[0]?.offsetY).toBe(0);
    expect(blink.materials).not.toEqual(start.materials);
  });

  it('is deterministic for repeated projection of the same runtime model and material binding', () => {
    const adapter = new FakeRuntimePreviewAdapter();
    const inspection = buildSceneInspection(GOLDEN_INSPECTION_FIXTURE, 101);
    const model = adapter.evaluate({ fixture: GOLDEN_INSPECTION_FIXTURE, inspection });

    expect(
      buildPixiPreviewPlan(
        model,
        1080,
        1920,
        SHOT03_SOURCE_BACKED_ASSETS,
        SHOT03_WATER_MATERIAL_BINDINGS,
        GOLDEN_TIMING,
      ),
    ).toEqual(
      buildPixiPreviewPlan(
        model,
        1080,
        1920,
        SHOT03_SOURCE_BACKED_ASSETS,
        SHOT03_WATER_MATERIAL_BINDINGS,
        GOLDEN_TIMING,
      ),
    );
  });

  it('requires explicit exact timing when a material binding is present', () => {
    const adapter = new FakeRuntimePreviewAdapter();
    const inspection = buildSceneInspection(GOLDEN_INSPECTION_FIXTURE, 101);
    const model = adapter.evaluate({ fixture: GOLDEN_INSPECTION_FIXTURE, inspection });

    expect(() =>
      buildPixiPreviewPlan(
        model,
        1080,
        1920,
        SHOT03_SOURCE_BACKED_ASSETS,
        SHOT03_WATER_MATERIAL_BINDINGS,
      ),
    ).toThrow(/require exact fps and durationFrames/i);
  });

  it('uses the adapter library manual exact-frame policy', () => {
    const options = buildPixiApplicationOptions(1080, 1920);

    expect(PIXI_PREVIEW_RENDER_MODE).toBe('manual-exact-frame');
    expect(options.autoStart).toBe(false);
    expect(options.sharedTicker).toBe(false);
    expect(options.preference).toBe('webgl');
    expect(options.width).toBe(1080);
    expect(options.height).toBe(1920);
  });

  it('rejects invalid viewport dimensions rather than inventing a canvas', () => {
    const adapter = new FakeRuntimePreviewAdapter();
    const inspection = buildSceneInspection(GOLDEN_INSPECTION_FIXTURE, 101);
    const model = adapter.evaluate({ fixture: GOLDEN_INSPECTION_FIXTURE, inspection });

    expect(() => buildPixiPreviewPlan(model, 0, 1920)).toThrow(/positive integer/i);
    expect(() => buildPixiPreviewPlan(model, 1080, Number.NaN)).toThrow(/positive integer/i);
    expect(() => buildPixiApplicationOptions(-1, 1920)).toThrow(/positive integer/i);
  });
});
