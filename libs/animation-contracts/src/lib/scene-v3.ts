import type { ActorInstance, PropInstance } from './actor';
import type { AssetReference } from './asset-ref';
import type { CameraTrack } from './camera';
import type { CrowdDefinition } from './crowd';
import type { EffectTrack } from './effect';
import type { EnvironmentInstance } from './environment';
import type { HerdDefinition } from './herd';
import type {
  HistoricalSourceId,
  SceneId,
  VisualEvidenceId,
} from './ids';
import type { MaterialTrack } from './material';
import type { MontageDefinition } from './montage';
import type { PerformanceBinding } from './performance';
import type { SceneQaContract } from './qa';
import type { SimulationBinding } from './simulation';
import type { StoryBinding } from './story-binding';
import type { WorldStateTrack } from './world-state';
import type { SceneV3SchemaVersion } from './versioning';

export interface SceneV3 {
  schemaVersion: SceneV3SchemaVersion;
  id: SceneId;
  revision: number;
  title?: string;

  story: StoryBinding;
  historicalSourceIds: readonly HistoricalSourceId[];
  visualEvidenceIds: readonly VisualEvidenceId[];
  assets: readonly AssetReference[];

  fps: number;
  durationFrames: number;
  width: number;
  height: number;
  seed: number;

  camera: readonly CameraTrack[];
  actors: readonly ActorInstance[];
  props: readonly PropInstance[];
  environments: readonly EnvironmentInstance[];
  performances: readonly PerformanceBinding[];
  materials: readonly MaterialTrack[];
  effects: readonly EffectTrack[];
  simulations: readonly SimulationBinding[];
  crowds: readonly CrowdDefinition[];
  herds: readonly HerdDefinition[];
  worldStates: readonly WorldStateTrack[];
  montage?: MontageDefinition;

  qa: SceneQaContract;
}
