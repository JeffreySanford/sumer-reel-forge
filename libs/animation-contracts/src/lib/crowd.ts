import type { CrowdId } from './ids';

export interface CrowdDefinition {
  id: CrowdId;
  runtimeId: string;
  actorPool: readonly string[];
  count: number;
  seed: number;
  regionId: string;
  behaviorId: string;
  variationIds?: readonly string[];
}
