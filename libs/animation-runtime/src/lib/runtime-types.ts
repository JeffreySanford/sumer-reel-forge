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

export type RuntimeFrameMode = 'preview' | 'storybook' | 'render' | 'qa';

/** Structurally compatible with animation-frame FrameContext without importing sibling sources. */
export interface RuntimeFrameContext {
  readonly frame: number;
  readonly fps: number;
  readonly durationFrames: number;
  readonly timeSeconds: number;
  readonly progress: number;
  readonly sceneId: string;
  readonly shotId?: string;
  readonly sceneSeed: number;
  readonly mode: RuntimeFrameMode;
}

export type RuntimeValidationSeverity = 'error' | 'warning';

export interface RuntimeValidationIssue {
  readonly severity: RuntimeValidationSeverity;
  readonly code: string;
  readonly message: string;
}

export interface RuntimeValidationResult {
  readonly valid: boolean;
  readonly issues: readonly RuntimeValidationIssue[];
}

export interface RuntimeFrameState {
  readonly runtimeType: RuntimeType;
  readonly definitionId: string;
  readonly frame: number;
  readonly values: Readonly<Record<string, unknown>>;
  readonly proofState?: string;
}
