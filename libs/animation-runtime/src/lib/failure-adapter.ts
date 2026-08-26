import type { AnimationRuntimeAdapter } from './adapter';
import type { RuntimeCapability } from './capability';
import type { RuntimeEvidence } from './evidence';
import type { PrepareContext } from './prepare-context';
import type { RuntimeFrameContext, RuntimeFrameState, RuntimeValidationResult } from './runtime-types';

export type FailureMode =
  | 'none'
  | 'prepare-throws'
  | 'evaluate-throws'
  | 'nondeterministic-value'
  | 'checksum-mismatch'
  | 'evidence-unavailable'
  | 'dispose-throws';

export interface FailureRuntimeDefinition {
  readonly id: string;
  readonly failureMode: FailureMode;
  readonly failAtFrame?: number;
  readonly checksumKey?: string;
  readonly expectedChecksum?: string;
}

export interface PreparedFailureRuntime {
  readonly definition: FailureRuntimeDefinition;
  readonly sceneId: string;
}

export class FailureRuntimeAdapter
  implements AnimationRuntimeAdapter<FailureRuntimeDefinition, PreparedFailureRuntime>
{
  readonly type = 'fake' as const;
  readonly version = 'failure-1.0.0';
  readonly capabilities: readonly RuntimeCapability[];
  private evaluationCounter = 0;

  constructor(capabilities: readonly RuntimeCapability[] = ['2d-transform']) {
    this.capabilities = [...capabilities];
  }

  validate(definition: FailureRuntimeDefinition): RuntimeValidationResult {
    if (!definition.id.trim()) {
      return {
        valid: false,
        issues: [
          {
            severity: 'error',
            code: 'runtime.failure.id.required',
            message: 'Failure runtime definition id is required.',
          },
        ],
      };
    }
    return { valid: true, issues: [] };
  }

  async prepare(
    definition: FailureRuntimeDefinition,
    ctx: PrepareContext,
  ): Promise<PreparedFailureRuntime> {
    if (definition.failureMode === 'prepare-throws') {
      throw new Error(`Intentional prepare failure for ${definition.id}.`);
    }
    if (definition.failureMode === 'checksum-mismatch') {
      const key = definition.checksumKey ?? '';
      const actual = ctx.assetChecksums[key];
      if (!key || !definition.expectedChecksum || actual !== definition.expectedChecksum) {
        throw new Error(
          `Intentional checksum mismatch for ${definition.id}: expected ${definition.expectedChecksum ?? '<missing>'}, received ${actual ?? '<missing>'}.`,
        );
      }
    }
    return Object.freeze({ definition: Object.freeze({ ...definition }), sceneId: ctx.sceneId });
  }

  evaluate(
    prepared: PreparedFailureRuntime,
    frame: RuntimeFrameContext,
  ): RuntimeFrameState {
    if (
      prepared.definition.failureMode === 'evaluate-throws' &&
      frame.frame === (prepared.definition.failAtFrame ?? 0)
    ) {
      throw new Error(
        `Intentional evaluate failure for ${prepared.definition.id} at frame ${frame.frame}.`,
      );
    }

    if (prepared.definition.failureMode === 'nondeterministic-value') {
      this.evaluationCounter += 1;
    }

    return Object.freeze({
      runtimeType: this.type,
      definitionId: prepared.definition.id,
      frame: frame.frame,
      values: Object.freeze({
        value:
          prepared.definition.failureMode === 'nondeterministic-value'
            ? this.evaluationCounter
            : frame.frame,
      }),
    });
  }

  collectEvidence(
    prepared: PreparedFailureRuntime,
    frame: RuntimeFrameContext,
  ): RuntimeEvidence {
    if (prepared.definition.failureMode === 'evidence-unavailable') {
      throw new Error(`Intentional evidence failure for ${prepared.definition.id}.`);
    }
    return Object.freeze({
      runtimeType: this.type,
      runtimeVersion: this.version,
      definitionId: prepared.definition.id,
      frame: frame.frame,
      capabilities: this.capabilities,
      values: this.evaluate(prepared, frame).values,
    });
  }

  dispose(prepared: PreparedFailureRuntime): void {
    if (prepared.definition.failureMode === 'dispose-throws') {
      throw new Error(`Intentional dispose failure for ${prepared.definition.id}.`);
    }
  }
}
