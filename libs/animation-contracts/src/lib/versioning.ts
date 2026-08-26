export const SCENE_V3_SCHEMA_VERSION = '3' as const;
export type SceneV3SchemaVersion = typeof SCENE_V3_SCHEMA_VERSION;

export interface VersionedReference {
  id: string;
  version: string;
}
