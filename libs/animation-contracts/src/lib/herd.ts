import type { HerdId } from './ids';

export type HerdBehavior = 'graze' | 'walk' | 'procession' | 'rest' | 'scatter';

export interface HerdDefinition {
  id: HerdId;
  species: string;
  count: number;
  rigPool: readonly string[];
  seed: number;
  pathId?: string;
  regionId?: string;
  behavior: HerdBehavior;
}
