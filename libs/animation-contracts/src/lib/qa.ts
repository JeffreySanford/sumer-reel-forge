export type SceneQaCategory =
  | 'identity'
  | 'historical-provenance'
  | 'motion'
  | 'material'
  | 'containment'
  | 'camera'
  | 'accessibility'
  | 'human-review';

export interface SceneQaInvariant {
  id: string;
  category: SceneQaCategory;
  description: string;
  blocking: boolean;
}

export interface AnimationKeyState {
  id: string;
  frame: number;
  description: string;
}

export interface SceneQaContract {
  requiredInvariants: readonly SceneQaInvariant[];
  benchmarkStates: readonly AnimationKeyState[];
  semanticActionIds?: readonly string[];
  renderProofIds?: readonly string[];
  humanReviewRequired: boolean;
}
