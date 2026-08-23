export type PlanningProviderId = 'deterministic' | 'ollama';

export interface PlanningProviderCapability {
  id: PlanningProviderId;
  available: boolean;
  configuredModel?: string;
  configuredVisionModel?: string;
  models?: string[];
  text: boolean;
  vision: boolean;
  structuredOutput: boolean;
  detail?: string;
}

export interface PlanningCapabilitiesResponse {
  defaultProvider: PlanningProviderId;
  providers: PlanningProviderCapability[];
}

export interface ShotPlanRequest {
  provider?: PlanningProviderId;
  shotId: string;
  storyFunction: string;
  emotionalPurpose: string;
  narration?: string;
  eyeTarget?: string;
  stillnessAnchor?: string;
  styleRules?: string[];
  constraints?: string[];
  availableAssets?: string[];
}

export interface CreatePlanningRunRequest extends ShotPlanRequest {
  projectSlug: string;
  chapterNumber: number;
  episodeNumber: number;
  shotNumber: number;
}

export interface ShotPlanProposal {
  provider: PlanningProviderId;
  model?: string;
  shotId: string;
  status: 'scaffold' | 'proposal';
  eyeTarget: string;
  stillnessAnchor: string;
  camera: {
    preset: string;
    scaleFrom: number;
    scaleTo: number;
    easing: string;
  };
  motionBudget: {
    primary: string;
    subject: string;
    environment: string[];
    lighting: string;
  };
  requiredAssets: string[];
  inheritedStyleRules: string[];
  unresolvedQuestions: string[];
  rationale: string;
}

export type PlanningRunState =
  | 'proposal-ready'
  | 'approved'
  | 'rejected'
  | 'superseded'
  | 'failed';

export interface PlanningRunView {
  id: string;
  reelId: string;
  shotNumber: number;
  shotKey: string;
  provider: string;
  model?: string;
  promptVersion: string;
  status: PlanningRunState;
  inputHash: string;
  outputHash: string;
  workingHash: string;
  input: ShotPlanRequest;
  proposal: ShotPlanProposal;
  workingProposal: ShotPlanProposal;
  durationMs?: number;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DirectionCheck {
  label: string;
  status: 'pass' | 'review' | 'fail';
  detail: string;
}
