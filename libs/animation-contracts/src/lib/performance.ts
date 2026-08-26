import type { ActorId, PerformanceClipId } from './ids';
import type { FrameRange, TrackValue } from './track';

export type PerformanceBlendMode = 'replace' | 'additive' | 'weighted';

export interface PerformanceBinding extends FrameRange {
  id: string;
  actorId: ActorId;
  channel: string;
  clipId: PerformanceClipId;
  weight?: TrackValue<number>;
  parameters?: Readonly<Record<string, TrackValue<unknown>>>;
  blendMode?: PerformanceBlendMode;
}

export interface PerformanceClip {
  id: PerformanceClipId;
  actorClass: string;
  semanticAction: string;
  durationFrames: number;
  loop: boolean;
  channels: readonly string[];
  keyStates: readonly string[];
}
