import type { WorldStateId } from './ids';
import type { FrameRange, TrackValue } from './track';

export interface WorldStateTrack extends FrameRange {
  id: WorldStateId;
  targetId: string;
  stateDefinitionId: string;
  parameters: Readonly<Record<string, TrackValue<unknown>>>;
}
