export interface MontageSegment {
  id: string;
  startFrame: number;
  endFrame: number;
  fictionalElapsedLabel?: string;
  continuityAnchorIds?: readonly string[];
}

export interface MontageDefinition {
  id: string;
  segments: readonly MontageSegment[];
}
