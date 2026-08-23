export type SceneV2MotionPreset =
  | 'cinematicSlow'
  | 'heavyPhysical'
  | 'clothLag'
  | 'waterPulse'
  | 'boatBob'
  | 'riggingTension'
  | 'breathing'
  | 'blinkOnce'
  | 'subtleGazeShift'
  | 'numinousDrift'
  | 'mistDrift'
  | 'smokeDrift'
  | 'riseReveal'
  | 'settle';

export interface SceneV2Camera {
  preset: string;
  scaleFrom: number;
  scaleTo: number;
  xFrom: number;
  xTo: number;
  yFrom: number;
  yTo: number;
  rotationFrom: number;
  rotationTo: number;
  easing: 'cinematicSlow';
  settleFromProgress: number;
}

export interface SceneV2Layer {
  id: string;
  assetId: string;
  assetPath: string;
  role:
    | 'background'
    | 'environment'
    | 'water'
    | 'major-prop'
    | 'character'
    | 'character-state'
    | 'foreground-occluder'
    | 'atmosphere'
    | 'mask'
    | 'light'
    | 'reflection'
    | 'caption-support';
  material: string;
  depth: number;
  anchor: string;
  transform: { x: number; y: number; scale: number };
  motionPresets: SceneV2MotionPreset[];
  required: boolean;
}

export interface SceneV2Atmosphere {
  id: string;
  preset: SceneV2MotionPreset;
  intensity: number;
  depthRange?: [number, number];
}

export interface SceneV2Lighting {
  id: string;
  preset: SceneV2MotionPreset;
  intensityFrom: number;
  intensityTo: number;
}

export interface SceneV2Performance {
  target: string;
  preset: SceneV2MotionPreset;
  startProgress: number;
  endProgress: number;
  intensity: number;
  enabled?: boolean;
  deferredUntilAssetId?: string;
}

export interface SceneV2Shot {
  id: string;
  sourceShotNumber: number;
  sourceStartFrame?: number;
  startFrame: number;
  durationFrames: number;
  emotionalPurpose: string;
  eyeTarget: string;
  stillnessAnchor: string;
  camera: SceneV2Camera;
  layers: SceneV2Layer[];
  performance: SceneV2Performance[];
  atmosphere: SceneV2Atmosphere[];
  lighting: SceneV2Lighting[];
  captionPolicy: {
    safeZone: string;
    avoidTargets: string[];
    motion: 'stable';
    maxLines: number;
  };
  transitionIn?: string;
  transitionOut?: string;
}

export interface SceneV2ReviewMarker {
  id: string;
  progress: number;
}

export interface SceneV2 {
  schemaVersion: 2;
  sceneId: string;
  projectSlug: string;
  chapterNumber: number;
  reelId: string;
  episodeNumber: number;
  visualBible: string;
  styleBible: string;
  assetVersion: string;
  assetManifestPath?: string;
  assetStrategy?: 'scene-only' | 'prefer-animation-manifest';
  width: number;
  height: number;
  fps: number;
  durationFrames: number;
  shots: SceneV2Shot[];
  transitions: unknown[];
  reviewMarkers: SceneV2ReviewMarker[];
  reviewPolicy: {
    scorecard: string;
    humanApprovalRequired: boolean;
    minimumCategory: number;
    publishabilityMinimum: number;
    hardFailsBlockApproval: boolean;
  };
  sourcePolicy: {
    storyMutationAllowed: boolean;
    narrationSource: string;
    captionSource: string;
    visualSource: string;
  };
}

export interface SceneV2ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const ALLOWED_PRESETS = new Set<SceneV2MotionPreset>([
  'cinematicSlow',
  'heavyPhysical',
  'clothLag',
  'waterPulse',
  'boatBob',
  'riggingTension',
  'breathing',
  'blinkOnce',
  'subtleGazeShift',
  'numinousDrift',
  'mistDrift',
  'smokeDrift',
  'riseReveal',
  'settle',
]);

const SHOT_FOUR_CHARACTER_PERFORMANCE_PRESETS = new Set<SceneV2MotionPreset>([
  'breathing',
  'blinkOnce',
  'subtleGazeShift',
]);

export function validateSceneV2(scene: SceneV2): SceneV2ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (scene.schemaVersion !== 2) errors.push('schemaVersion must be 2.');
  if (scene.width <= 0 || scene.height <= 0) errors.push('Scene dimensions must be positive.');
  if (scene.fps <= 0) errors.push('fps must be positive.');
  if (scene.durationFrames <= 0) errors.push('durationFrames must be positive.');
  if (!scene.reviewPolicy?.humanApprovalRequired) {
    errors.push('Scene V2 requires human approval.');
  }
  if (scene.sourcePolicy?.storyMutationAllowed !== false) {
    errors.push('Scene V2 may not mutate story text.');
  }
  if (!scene.shots.length) errors.push('Scene V2 requires at least one shot.');
  if (
    scene.assetStrategy === 'prefer-animation-manifest' &&
    !scene.assetManifestPath
  ) {
    errors.push('Scene V2 prefer-animation-manifest requires assetManifestPath.');
  }
  if (
    scene.assetManifestPath &&
    (scene.assetManifestPath.includes('..') ||
      scene.assetManifestPath.startsWith('/') ||
      scene.assetManifestPath.startsWith('\\'))
  ) {
    errors.push('Scene V2 assetManifestPath must be relative to the configured asset root.');
  }

  for (const shot of scene.shots) {
    const endFrame = shot.startFrame + shot.durationFrames;
    if (shot.startFrame < 0 || shot.durationFrames <= 0 || endFrame > scene.durationFrames) {
      errors.push(`Shot ${shot.id} falls outside scene frame bounds.`);
    }
    if (shot.camera.easing !== 'cinematicSlow') {
      errors.push(`Shot ${shot.id} must use cinematicSlow camera easing.`);
    }
    if (shot.camera.settleFromProgress < 0 || shot.camera.settleFromProgress > 1) {
      errors.push(`Shot ${shot.id} settleFromProgress must be from 0 through 1.`);
    }
    const cameraDelta = Math.abs(shot.camera.scaleTo - shot.camera.scaleFrom);
    const cameraLimit =
      shot.sourceShotNumber === 3 ? 0.03 : shot.sourceShotNumber === 4 ? 0.01 : 0.05;
    if (cameraDelta > cameraLimit + Number.EPSILON) {
      errors.push(
        `Shot ${shot.id} camera scale delta ${(cameraDelta * 100).toFixed(2)}% exceeds ${(cameraLimit * 100).toFixed(0)}%.`,
      );
    }
    if (shot.sourceShotNumber === 4) {
      validateShotFourPolicy(shot, errors);
    }
    if (!shot.layers.some((layer) => layer.required)) {
      errors.push(`Shot ${shot.id} has no required visual layer.`);
    }
    for (const layer of shot.layers) {
      if (layer.required && !layer.assetPath) {
        errors.push(`Required layer ${layer.id} has no assetPath.`);
      }
      if (layer.assetPath.includes('..') || layer.assetPath.startsWith('/')) {
        errors.push(`Layer ${layer.id} assetPath must be relative to the configured public asset root.`);
      }
      for (const preset of layer.motionPresets) {
        if (!ALLOWED_PRESETS.has(preset)) {
          errors.push(`Layer ${layer.id} uses unknown motion preset ${preset}.`);
        }
      }
    }
    for (const item of [...shot.performance, ...shot.atmosphere, ...shot.lighting]) {
      if (!ALLOWED_PRESETS.has(item.preset)) {
        errors.push(`Shot ${shot.id} uses unknown motion preset ${item.preset}.`);
      }
    }
    const deferredPerformance = shot.performance.filter((item) => item.enabled === false);
    if (deferredPerformance.length) {
      warnings.push(
        `Shot ${shot.id} defers ${deferredPerformance.length} performance preset(s) until layered assets exist.`,
      );
    }
  }

  for (const marker of scene.reviewMarkers) {
    if (marker.progress < 0 || marker.progress > 1) {
      errors.push(`Review marker ${marker.id} must be from 0 through 1.`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateShotFourPolicy(shot: SceneV2Shot, errors: string[]): void {
  if (!['nearStatic', 'static'].includes(shot.camera.preset)) {
    errors.push(`Shot ${shot.id} must use a nearStatic or static camera preset.`);
  }
  if (
    Math.abs(shot.camera.rotationFrom) > Number.EPSILON ||
    Math.abs(shot.camera.rotationTo) > Number.EPSILON
  ) {
    errors.push(`Shot ${shot.id} may not use camera rotation.`);
  }

  const enabledPerformance = shot.performance.filter((item) => item.enabled !== false);
  if (!enabledPerformance.some((item) => item.preset === 'numinousDrift')) {
    errors.push(`Shot ${shot.id} requires enabled numinousDrift environmental coherence.`);
  }
  const conventionalCharacterPerformance = enabledPerformance.filter((item) =>
    SHOT_FOUR_CHARACTER_PERFORMANCE_PRESETS.has(item.preset),
  );
  if (conventionalCharacterPerformance.length) {
    errors.push(
      `Shot ${shot.id} may not animate Nammu with conventional character performance presets.`,
    );
  }
}

export function assertSceneV2(scene: SceneV2): void {
  const result = validateSceneV2(scene);
  if (!result.valid) {
    throw new Error(`Invalid Scene V2:\n- ${result.errors.join('\n- ')}`);
  }
}

export function cinematicSlow(progress: number, settleFromProgress = 0.82): number {
  const t = clamp(progress, 0, 1);
  const settle = clamp(settleFromProgress, 0.5, 0.98);
  if (t <= settle) {
    const normalized = t / settle;
    return (normalized * normalized * (3 - 2 * normalized)) * 0.94;
  }
  const tail = (t - settle) / (1 - settle);
  const easedTail = 1 - Math.pow(1 - tail, 3);
  return 0.94 + easedTail * 0.06;
}

export function interpolateNumber(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
