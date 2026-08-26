import type { EffectId } from './ids';
import type { RuntimeReference } from './runtime-reference';
import type { FrameRange, TrackValue } from './track';

export interface EffectTrack extends FrameRange {
  id: EffectId;
  runtime: RuntimeReference;
  targetId?: string;
  effectDefinitionId: string;
  parameters: Readonly<Record<string, TrackValue<unknown>>>;
}
