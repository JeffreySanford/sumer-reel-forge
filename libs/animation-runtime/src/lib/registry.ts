import type { AnimationRuntimeAdapter } from './adapter';
import { missingCapabilities, type RuntimeCapability } from './capability';
import type { RuntimeRegistryEvidence } from './evidence';
import type { RuntimeType, RuntimeValidationResult } from './runtime-types';

export interface RuntimeLookup {
  readonly type: RuntimeType;
  readonly version: string;
}

export interface RuntimeRequirement extends RuntimeLookup {
  readonly ownerId: string;
  readonly capabilities: readonly RuntimeCapability[];
}

type AnyAdapter = AnimationRuntimeAdapter<unknown, unknown>;

function key(type: RuntimeType, version: string): string {
  return `${type}@${version}`;
}

function validationResult(
  issues: readonly { severity: 'error' | 'warning'; code: string; message: string }[],
): RuntimeValidationResult {
  return {
    valid: !issues.some((issue) => issue.severity === 'error'),
    issues,
  };
}

export class AnimationRuntimeRegistry {
  private readonly adapters = new Map<string, AnyAdapter>();

  register<TDefinition, TPrepared>(
    adapter: AnimationRuntimeAdapter<TDefinition, TPrepared>,
  ): void {
    if (!adapter.version.trim()) {
      throw new TypeError(`Runtime ${adapter.type} requires a version.`);
    }
    const adapterKey = key(adapter.type, adapter.version);
    if (this.adapters.has(adapterKey)) {
      throw new Error(`Runtime ${adapterKey} is already registered.`);
    }
    this.adapters.set(adapterKey, adapter as unknown as AnyAdapter);
  }

  resolve<TDefinition = unknown, TPrepared = unknown>(
    lookup: RuntimeLookup,
  ): AnimationRuntimeAdapter<TDefinition, TPrepared> | undefined {
    return this.adapters.get(key(lookup.type, lookup.version)) as unknown as
      | AnimationRuntimeAdapter<TDefinition, TPrepared>
      | undefined;
  }

  require<TDefinition = unknown, TPrepared = unknown>(
    lookup: RuntimeLookup,
  ): AnimationRuntimeAdapter<TDefinition, TPrepared> {
    const adapter = this.resolve<TDefinition, TPrepared>(lookup);
    if (!adapter) {
      throw new Error(`Runtime ${key(lookup.type, lookup.version)} is not registered.`);
    }
    return adapter;
  }

  validateRequirement(requirement: RuntimeRequirement): RuntimeValidationResult {
    const adapter = this.resolve(requirement);
    if (!adapter) {
      return validationResult([
        {
          severity: 'error',
          code: 'runtime.registry.missing',
          message: `${requirement.ownerId} requires unregistered runtime ${key(requirement.type, requirement.version)}.`,
        },
      ]);
    }

    const missing = missingCapabilities(adapter.capabilities, requirement.capabilities);
    return validationResult(
      missing.map((capability) => ({
        severity: 'error' as const,
        code: 'runtime.capability.missing',
        message: `${requirement.ownerId} requires ${capability}, but ${key(requirement.type, requirement.version)} does not provide it.`,
      })),
    );
  }

  evidence(): RuntimeRegistryEvidence {
    const runtimes = [...this.adapters.values()]
      .map((adapter) => ({
        type: adapter.type,
        version: adapter.version,
        capabilities: [...adapter.capabilities].sort(),
      }))
      .sort((left, right) =>
        key(left.type, left.version).localeCompare(key(right.type, right.version)),
      );
    return Object.freeze({ runtimes: Object.freeze(runtimes) });
  }
}
