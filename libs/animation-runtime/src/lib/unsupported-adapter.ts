import type { AnimationRuntimeAdapter } from './adapter';
import type { RuntimeEvidence } from './evidence';
import type { PrepareContext } from './prepare-context';
import type { RuntimeFrameContext, RuntimeFrameState, RuntimeType, RuntimeValidationResult } from './runtime-types';

export interface UnsupportedRuntimeDefinition {
  readonly id: string;
  readonly requestedRuntime: RuntimeType;
}

export class UnsupportedRuntimeAdapter
  implements AnimationRuntimeAdapter<UnsupportedRuntimeDefinition, UnsupportedRuntimeDefinition>
{
  readonly type = 'fake' as const;
  readonly version = 'unsupported-1.0.0';
  readonly capabilities = [] as const;

  validate(definition: UnsupportedRuntimeDefinition): RuntimeValidationResult {
    return {
      valid: false,
      issues: [
        {
          severity: 'error',
          code: 'runtime.unsupported',
          message: `Runtime ${definition.requestedRuntime} is intentionally unsupported by this adapter.`,
        },
      ],
    };
  }

  async prepare(
    definition: UnsupportedRuntimeDefinition,
    _ctx: PrepareContext,
  ): Promise<UnsupportedRuntimeDefinition> {
    throw new Error(this.validate(definition).issues[0]?.message ?? 'Unsupported runtime.');
  }

  evaluate(
    definition: UnsupportedRuntimeDefinition,
    frame: RuntimeFrameContext,
  ): RuntimeFrameState {
    throw new Error(`Cannot evaluate unsupported runtime ${definition.requestedRuntime} at frame ${frame.frame}.`);
  }

  collectEvidence(
    definition: UnsupportedRuntimeDefinition,
    frame: RuntimeFrameContext,
  ): RuntimeEvidence {
    throw new Error(`Cannot collect evidence for unsupported runtime ${definition.requestedRuntime} at frame ${frame.frame}.`);
  }

  dispose(_definition: UnsupportedRuntimeDefinition): void {
    // Nothing was prepared, so there is nothing to dispose.
  }
}
