import type { ActorId, AssetId } from './ids';
import type { RuntimeReference } from './runtime-reference';
import type { TransformDefinition } from './track';

export type DepthMode = '2d' | 'card' | 'mesh' | 'hybrid';

export interface ActorInstance {
  id: ActorId;
  actorDefinitionId: string;
  runtime: RuntimeReference;
  rigAssetId: AssetId;
  sourceAssetIds: readonly AssetId[];
  transform: TransformDefinition;
  depthMode: DepthMode;
  facing?: number;
}

export interface PropInstance {
  id: string;
  definitionId: string;
  runtime: RuntimeReference;
  assetId: AssetId;
  transform: TransformDefinition;
}
