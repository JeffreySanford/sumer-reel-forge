import type { ShotPlanProposal, ShotPlanningInput } from './planning-provider';

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
  input: ShotPlanningInput;
  proposal: ShotPlanProposal;
  workingProposal: ShotPlanProposal;
  durationMs?: number;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}
