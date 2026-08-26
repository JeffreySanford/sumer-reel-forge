export type RuntimeCapability =
  | '2d-transform'
  | '2d-mesh'
  | 'skeletal-character'
  | 'facial-performance'
  | 'spatial-placement'
  | 'spatial-camera'
  | 'physics-playback'
  | 'physics-authoring'
  | 'crowd-evaluation'
  | 'world-state'
  | 'montage'
  | 'generative-bake';

export interface RuntimeCapabilityRequirement {
  readonly ownerId: string;
  readonly capabilities: readonly RuntimeCapability[];
}

export function missingCapabilities(
  available: readonly RuntimeCapability[],
  required: readonly RuntimeCapability[],
): RuntimeCapability[] {
  const known = new Set(available);
  return [...new Set(required)].filter((capability) => !known.has(capability));
}
