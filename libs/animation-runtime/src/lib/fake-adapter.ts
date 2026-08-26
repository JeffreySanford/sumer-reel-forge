import type { AnimationRuntimeAdapter } from './adapter';
import type { RuntimeCapability } from './capability';
import type { RuntimeEvidence } from './evidence';
import type { PrepareContext } from './prepare-context';
import type { RuntimeFrameContext, RuntimeFrameState, RuntimeValidationResult } from './runtime-types';

export interface FakeRuntimeDefinition {
  readonly id: string;
  readonly origin?: { readonly x: number; readonly y: number };
  readonly velocityPerFrame?: { readonly x: number; readonly y: number };
  readonly opacity?: number;
  readonly opacityDeltaPerFrame?: number;
  readonly proofStates?: Readonly<Record<number, string>>;
}

export interface PreparedFakeRuntime {
  readonly definition: FakeRuntimeDefinition;
  readonly sceneId: string;
}

function ok(): RuntimeValidationResult {
  return { valid: true, issues: [] };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export class FakeRuntimeAdapter
  implements AnimationRuntimeAdapter<FakeRuntimeDefinition, PreparedFakeRuntime>
{
  readonly type = 'fake' as const;
  readonly version = '1.0.0';
  readonly capabilities: readonly RuntimeCapability[] = [
    '2d-transform',
    'world-state',
  ];
  private readonly disposedIds = new Set<string>();

  validate(definition: FakeRuntimeDefinition): RuntimeValidationResult {
    if (!definition.id.trim()) {
      return {
        valid: false,
        issues: [
          {
            severity: 'error',
            code: 'runtime.fake.id.required',
            message: 'Fake runtime definition id is required.',
          },
        ],
      };
    }
    return ok();
  }

  async prepare(
    definition: FakeRuntimeDefinition,
    ctx: PrepareContext,
  ): Promise<PreparedFakeRuntime> {
    const validation = this.validate(definition);
    if (!validation.valid) {
      throw new Error(validation.issues.map((issue) => issue.message).join('; '));
    }
    return Object.freeze({ definition: Object.freeze({ ...definition }), sceneId: ctx.sceneId });
  }

  evaluate(prepared: PreparedFakeRuntime, frame: RuntimeFrameContext): RuntimeFrameState {
    const origin = prepared.definition.origin ?? { x: 0, y: 0 };
    const velocity = prepared.definition.velocityPerFrame ?? { x: 0, y: 0 };
    const opacity = clamp01(
      (prepared.definition.opacity ?? 1) +
        (prepared.definition.opacityDeltaPerFrame ?? 0) * frame.frame,
    );
    return Object.freeze({
      runtimeType: this.type,
      definitionId: prepared.definition.id,
      frame: frame.frame,
      values: Object.freeze({
        x: origin.x + velocity.x * frame.frame,
        y: origin.y + velocity.y * frame.frame,
        opacity,
      }),
      proofState: prepared.definition.proofStates?.[frame.frame],
    });
  }

  collectEvidence(
    prepared: PreparedFakeRuntime,
    frame: RuntimeFrameContext,
  ): RuntimeEvidence {
    const state = this.evaluate(prepared, frame);
    return Object.freeze({
      runtimeType: this.type,
      runtimeVersion: this.version,
      definitionId: prepared.definition.id,
      frame: frame.frame,
      capabilities: this.capabilities,
      values: state.values,
    });
  }

  dispose(prepared: PreparedFakeRuntime): void {
    this.disposedIds.add(prepared.definition.id);
  }

  wasDisposed(definitionId: string): boolean {
    return this.disposedIds.has(definitionId);
  }
}
