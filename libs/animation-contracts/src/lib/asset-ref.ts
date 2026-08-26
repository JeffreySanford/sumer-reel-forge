import type { AssetId } from './ids';

export type AssetKind =
  | 'image'
  | 'audio'
  | 'rig'
  | 'model'
  | 'simulation-bake'
  | 'data'
  | 'other';

export interface AssetReference {
  id: AssetId;
  kind: AssetKind;
  logicalPath: string;
  sha256: string;
  revision: string;
  sourceAssetIds?: readonly AssetId[];
}
