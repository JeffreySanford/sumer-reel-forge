import type { MaterialId } from './ids';
import type { RuntimeReference } from './runtime-reference';
import type { FrameRange, TrackValue } from './track';

export interface ContainmentDefinition {
  maskAssetId?: string;
  boundaryTargetId?: string;
  tolerancePixels?: number;
}

export interface MaterialTrack extends FrameRange {
  id: MaterialId;
  runtime: RuntimeReference;
  targetId: string;
  materialDefinitionId: string;
  parameters: Readonly<Record<string, TrackValue<unknown>>>;
  containment?: ContainmentDefinition;
}
