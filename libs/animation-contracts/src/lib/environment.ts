import type { EnvironmentId } from './ids';
import type { RuntimeReference } from './runtime-reference';
import type { TransformDefinition } from './track';

export interface EnvironmentInstance {
  id: EnvironmentId;
  definitionId: string;
  runtime: RuntimeReference;
  transform?: TransformDefinition;
  stateBindingIds?: readonly string[];
}
