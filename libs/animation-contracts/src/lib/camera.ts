import type { RuntimeReference } from './runtime-reference';
import type { FrameRange, TrackValue, TransformDefinition } from './track';

export interface CameraSafeZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CameraTrack extends FrameRange {
  id: string;
  runtime: RuntimeReference;
  transform: TransformDefinition;
  projection: 'orthographic' | 'perspective';
  focalLength?: TrackValue<number>;
  fieldOfView?: TrackValue<number>;
  focusTargetId?: string;
  safeZones?: readonly CameraSafeZone[];
}
