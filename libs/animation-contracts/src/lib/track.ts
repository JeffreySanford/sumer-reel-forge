export type EasingId =
  | 'linear'
  | 'smoothstep'
  | 'smootherstep'
  | 'ease-in-quad'
  | 'ease-out-quad'
  | 'ease-in-out-cubic'
  | 'physical-lag-v1';

export interface FrameRange {
  startFrame: number;
  endFrame: number;
}

export interface ConstantValue<T> {
  type: 'constant';
  value: T;
}

export interface Keyframe<T> {
  frame: number;
  value: T;
  easing?: EasingId;
}

export interface KeyframeTrack<T> {
  type: 'keyframes';
  keyframes: readonly Keyframe<T>[];
}

export interface DriverBinding<T = unknown> {
  type: 'driver';
  driverId: string;
  sourceTargetId: string;
  sourceChannel: string;
  parameters: Readonly<Record<string, T>>;
}

export interface ExpressionBinding<T = unknown> {
  type: 'expression';
  expressionId: string;
  parameters: Readonly<Record<string, T>>;
}

export type TrackValue<T> =
  | ConstantValue<T>
  | KeyframeTrack<T>
  | DriverBinding
  | ExpressionBinding;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface TransformDefinition {
  position: TrackValue<Vec3>;
  rotation: TrackValue<Vec3>;
  scale: TrackValue<Vec3>;
  pivot?: Vec3;
  parentId?: string;
}
