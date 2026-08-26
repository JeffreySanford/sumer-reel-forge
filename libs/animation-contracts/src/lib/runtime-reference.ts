import type { RuntimeId } from './ids';

export type RuntimeType =
  | 'layered-v2'
  | 'rive'
  | 'pixi'
  | 'three'
  | 'rapier-baked'
  | 'spine'
  | 'crowd'
  | 'city'
  | 'montage'
  | 'generative-baked'
  | 'fake';

export interface RuntimeReference {
  id: RuntimeId;
  runtime: RuntimeType;
  runtimeVersion: string;
  definitionId: string;
}
