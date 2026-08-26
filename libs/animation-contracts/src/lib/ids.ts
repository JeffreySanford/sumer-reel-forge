export type SceneId = string;
export type ShotId = string;
export type ActorId = string;
export type PropId = string;
export type EnvironmentId = string;
export type MaterialId = string;
export type EffectId = string;
export type SimulationId = string;
export type CrowdId = string;
export type HerdId = string;
export type WorldStateId = string;
export type AssetId = string;
export type RuntimeId = string;
export type PerformanceClipId = string;
export type HistoricalSourceId = string;
export type VisualEvidenceId = string;

export const SEMANTIC_ID_PATTERN = /^[a-z][a-z0-9-]*(?::[a-z0-9][a-z0-9._-]*)+$/;

export function isSemanticId(value: string): boolean {
  return SEMANTIC_ID_PATTERN.test(value);
}
