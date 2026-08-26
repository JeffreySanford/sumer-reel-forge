import type { RuntimeCapability } from './capability';
import type { RuntimeType } from './runtime-types';

export interface RuntimeEvidence {
  readonly runtimeType: RuntimeType;
  readonly runtimeVersion: string;
  readonly definitionId: string;
  readonly frame: number;
  readonly capabilities: readonly RuntimeCapability[];
  readonly values: Readonly<Record<string, unknown>>;
}

export interface RuntimeRegistryEvidence {
  readonly runtimes: readonly {
    readonly type: RuntimeType;
    readonly version: string;
    readonly capabilities: readonly RuntimeCapability[];
  }[];
}
