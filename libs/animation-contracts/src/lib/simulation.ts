import type { AssetId, SimulationId } from './ids';

export interface SimulationBinding {
  id: SimulationId;
  engine: 'rapier';
  mode: 'baked';
  definitionAssetId: AssetId;
  bakeAssetId: AssetId;
  timestep: number;
  frameCount: number;
  receiptHash: string;
}
