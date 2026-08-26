import type { RuntimeCapability } from './capability';
import type { RuntimeFrameContext, RuntimeFrameState, RuntimeType, RuntimeValidationResult } from './runtime-types';
import type { PrepareContext } from './prepare-context';
import type { RuntimeEvidence } from './evidence';

export interface AnimationRuntimeAdapter<TDefinition, TPrepared> {
  readonly type: RuntimeType;
  readonly version: string;
  readonly capabilities: readonly RuntimeCapability[];

  validate(definition: TDefinition): RuntimeValidationResult;
  prepare(definition: TDefinition, ctx: PrepareContext): Promise<TPrepared>;
  evaluate(prepared: TPrepared, frame: RuntimeFrameContext): RuntimeFrameState;
  collectEvidence(prepared: TPrepared, frame: RuntimeFrameContext): RuntimeEvidence;
  dispose(prepared: TPrepared): void | Promise<void>;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`);
  return `{${entries.join(',')}}`;
}

export function assertDeterministicEvaluation<TDefinition, TPrepared>(
  adapter: AnimationRuntimeAdapter<TDefinition, TPrepared>,
  prepared: TPrepared,
  frame: RuntimeFrameContext,
): RuntimeFrameState {
  const first = adapter.evaluate(prepared, frame);
  const second = adapter.evaluate(prepared, frame);
  if (stableJson(first) !== stableJson(second)) {
    throw new Error(
      `Runtime ${adapter.type}@${adapter.version} produced nondeterministic state at frame ${frame.frame}.`,
    );
  }
  return first;
}
