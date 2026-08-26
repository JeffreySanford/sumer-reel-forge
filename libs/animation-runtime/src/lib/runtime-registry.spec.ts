import { assertDeterministicEvaluation } from './adapter';
import { FailureRuntimeAdapter, type FailureRuntimeDefinition } from './failure-adapter';
import { FakeRuntimeAdapter, type FakeRuntimeDefinition } from './fake-adapter';
import { AnimationRuntimeRegistry } from './registry';
import type { PrepareContext } from './prepare-context';
import type { RuntimeFrameContext } from './runtime-types';
import { UnsupportedRuntimeAdapter } from './unsupported-adapter';

const prepareContext: PrepareContext = {
  sceneId: 'scene:test:runtime',
  sceneRevision: 1,
  sceneSeed: 42,
  mode: 'qa',
  assetChecksums: {
    'asset:test:one': 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  },
};

const frame: RuntimeFrameContext = {
  frame: 10,
  fps: 30,
  durationFrames: 30,
  timeSeconds: 10 / 30,
  progress: 10 / 29,
  sceneId: 'scene:test:runtime',
  sceneSeed: 42,
  mode: 'qa',
};

async function preparedFailure(
  failureMode: FailureRuntimeDefinition['failureMode'],
  extra: Partial<FailureRuntimeDefinition> = {},
) {
  const adapter = new FailureRuntimeAdapter();
  const prepared = await adapter.prepare(
    { id: `definition:${failureMode}`, failureMode, ...extra },
    prepareContext,
  );
  return { adapter, prepared };
}

describe('Scene V3 runtime registry', () => {
  it('registers and resolves an exact runtime type/version pair', () => {
    const registry = new AnimationRuntimeRegistry();
    const adapter = new FakeRuntimeAdapter();
    registry.register(adapter);

    expect(registry.require({ type: 'fake', version: '1.0.0' })).toBe(adapter);
    expect(registry.resolve({ type: 'fake', version: '9.9.9' })).toBeUndefined();
  });

  it('rejects duplicate runtime type/version registration', () => {
    const registry = new AnimationRuntimeRegistry();
    registry.register(new FakeRuntimeAdapter());
    expect(() => registry.register(new FakeRuntimeAdapter())).toThrow(
      /already registered/,
    );
  });

  it('preflights required capabilities before runtime use', () => {
    const registry = new AnimationRuntimeRegistry();
    registry.register(new FakeRuntimeAdapter());

    expect(
      registry.validateRequirement({
        ownerId: 'actor:enki',
        type: 'fake',
        version: '1.0.0',
        capabilities: ['2d-transform'],
      }).valid,
    ).toBe(true);

    const missing = registry.validateRequirement({
      ownerId: 'actor:enki',
      type: 'fake',
      version: '1.0.0',
      capabilities: ['facial-performance'],
    });
    expect(missing.valid).toBe(false);
    expect(missing.issues[0]?.code).toBe('runtime.capability.missing');
  });

  it('reports a missing runtime before render', () => {
    const registry = new AnimationRuntimeRegistry();
    const result = registry.validateRequirement({
      ownerId: 'actor:enki',
      type: 'rive',
      version: '1.0.0',
      capabilities: ['skeletal-character'],
    });
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.code).toBe('runtime.registry.missing');
  });

  it('emits stable registry evidence ordering', () => {
    const registry = new AnimationRuntimeRegistry();
    registry.register(new FailureRuntimeAdapter());
    registry.register(new FakeRuntimeAdapter());
    expect(registry.evidence().runtimes.map(({ version }) => version)).toEqual([
      '1.0.0',
      'failure-1.0.0',
    ]);
  });
});

describe('fake and failure runtime adapters', () => {
  it('evaluates the fake adapter deterministically from frame input', async () => {
    const adapter = new FakeRuntimeAdapter();
    const definition: FakeRuntimeDefinition = {
      id: 'definition:fake:enki',
      origin: { x: 100, y: 200 },
      velocityPerFrame: { x: 2, y: -1 },
      opacity: 0.5,
      opacityDeltaPerFrame: 0.01,
      proofStates: { 10: 'proof:midpoint' },
    };
    const prepared = await adapter.prepare(definition, prepareContext);
    const state = assertDeterministicEvaluation(adapter, prepared, frame);

    expect(state.values).toEqual({ x: 120, y: 190, opacity: 0.6 });
    expect(state.proofState).toBe('proof:midpoint');
    expect(adapter.collectEvidence(prepared, frame).values).toEqual(state.values);
  });

  it('tracks fake adapter disposal', async () => {
    const adapter = new FakeRuntimeAdapter();
    const prepared = await adapter.prepare(
      { id: 'definition:fake:dispose' },
      prepareContext,
    );
    expect(adapter.wasDisposed(prepared.definition.id)).toBe(false);
    adapter.dispose(prepared);
    expect(adapter.wasDisposed(prepared.definition.id)).toBe(true);
  });

  it('surfaces intentional prepare failure', async () => {
    const adapter = new FailureRuntimeAdapter();
    await expect(
      adapter.prepare(
        { id: 'definition:fail:prepare', failureMode: 'prepare-throws' },
        prepareContext,
      ),
    ).rejects.toThrow(/Intentional prepare failure/);
  });

  it('surfaces intentional evaluate failure only at the configured frame', async () => {
    const { adapter, prepared } = await preparedFailure('evaluate-throws', {
      failAtFrame: 10,
    });
    expect(() => adapter.evaluate(prepared, { ...frame, frame: 9 })).not.toThrow();
    expect(() => adapter.evaluate(prepared, frame)).toThrow(/frame 10/);
  });

  it('detects intentionally nondeterministic repeated evaluation', async () => {
    const { adapter, prepared } = await preparedFailure('nondeterministic-value');
    expect(() => assertDeterministicEvaluation(adapter, prepared, frame)).toThrow(
      /nondeterministic state/,
    );
  });

  it('surfaces checksum mismatch during preparation', async () => {
    const adapter = new FailureRuntimeAdapter();
    await expect(
      adapter.prepare(
        {
          id: 'definition:fail:checksum',
          failureMode: 'checksum-mismatch',
          checksumKey: 'asset:test:one',
          expectedChecksum:
            'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        },
        prepareContext,
      ),
    ).rejects.toThrow(/checksum mismatch/);
  });

  it('surfaces unavailable evidence and dispose failure independently', async () => {
    const noEvidence = await preparedFailure('evidence-unavailable');
    expect(() => noEvidence.adapter.collectEvidence(noEvidence.prepared, frame)).toThrow(
      /evidence failure/,
    );

    const disposeFailure = await preparedFailure('dispose-throws');
    expect(() => disposeFailure.adapter.dispose(disposeFailure.prepared)).toThrow(
      /dispose failure/,
    );
  });

  it('rejects unsupported runtimes explicitly instead of silently dropping them', async () => {
    const adapter = new UnsupportedRuntimeAdapter();
    const definition = { id: 'definition:unsupported', requestedRuntime: 'rive' as const };
    expect(adapter.validate(definition).valid).toBe(false);
    await expect(adapter.prepare(definition, prepareContext)).rejects.toThrow(
      /intentionally unsupported/,
    );
  });
});
