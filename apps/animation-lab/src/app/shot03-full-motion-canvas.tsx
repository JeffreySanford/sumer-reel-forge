import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createPixiFullMotionSurface,
  type PixiFullMotionSurface,
  type PixiSourceAsset,
} from '@sumer-reel-forge/animation-pixi';
import previewStyles from './runtime-preview-panel.module.css';
import type { RuntimePreviewModel } from './runtime-preview';
import { buildShot03FullMotionState } from './shot03-full-motion';
import {
  buildShot03RecoveryBlinkMotionState,
  SHOT03_RECOVERY_BLINK_ACTIVE_PROFILE,
  SHOT03_RECOVERY_BLINK_CONTROL_PROFILE,
  type Shot03RecoveryBlinkProfile,
} from './shot03-recovery-blink-motion';
import {
  buildShot03RecoveryBreathMotionState,
  SHOT03_RECOVERY_BREATH_ACTIVE_PROFILE,
  SHOT03_RECOVERY_BREATH_CONTROL_PROFILE,
  type Shot03RecoveryBreathProfile,
} from './shot03-recovery-breath-motion';
import {
  buildShot03RecoveryCharacterMotionState,
  SHOT03_RECOVERY_CHARACTER_ACTIVE_PROFILE,
  SHOT03_RECOVERY_CHARACTER_CONTROL_PROFILE,
  type Shot03RecoveryCharacterProfile,
} from './shot03-recovery-character-motion';
import {
  buildShot03RecoveryMotionState,
  SHOT03_RECOVERY_ACTIVE_PROFILE,
  SHOT03_RECOVERY_CAMERA_ONLY_PROFILE,
  type Shot03RecoveryMotionProfile,
} from './shot03-recovery-motion';
import {
  buildShot03SecondaryMotionIsolationState,
  SHOT03_SECONDARY_ISOLATION_PROFILE,
} from './shot03-secondary-motion-isolation';
import {
  buildShot03RecoverySourceAssets,
  SHOT03_FULL_MOTION_SOURCE_ASSETS,
  SHOT03_RECOVERY_EYES_URL,
} from './shot03-source-backed-asset';

type PixiMountStatus = 'MOUNTING' | 'READY' | 'ERROR';
type Shot03MotionProfile =
  | 'cinematic'
  | typeof SHOT03_SECONDARY_ISOLATION_PROFILE
  | Shot03RecoveryMotionProfile
  | Shot03RecoveryBlinkProfile
  | Shot03RecoveryBreathProfile
  | Shot03RecoveryCharacterProfile;

function resolveMotionProfile(): Shot03MotionProfile {
  if (typeof window === 'undefined') return 'cinematic';
  const configured = new URLSearchParams(window.location.search).get(
    'shot03-motion-profile',
  );
  if (configured === SHOT03_SECONDARY_ISOLATION_PROFILE) {
    return SHOT03_SECONDARY_ISOLATION_PROFILE;
  }
  if (configured === SHOT03_RECOVERY_ACTIVE_PROFILE) {
    return SHOT03_RECOVERY_ACTIVE_PROFILE;
  }
  if (configured === SHOT03_RECOVERY_CAMERA_ONLY_PROFILE) {
    return SHOT03_RECOVERY_CAMERA_ONLY_PROFILE;
  }
  if (configured === SHOT03_RECOVERY_BLINK_ACTIVE_PROFILE) {
    return SHOT03_RECOVERY_BLINK_ACTIVE_PROFILE;
  }
  if (configured === SHOT03_RECOVERY_BLINK_CONTROL_PROFILE) {
    return SHOT03_RECOVERY_BLINK_CONTROL_PROFILE;
  }
  if (configured === SHOT03_RECOVERY_BREATH_ACTIVE_PROFILE) {
    return SHOT03_RECOVERY_BREATH_ACTIVE_PROFILE;
  }
  if (configured === SHOT03_RECOVERY_BREATH_CONTROL_PROFILE) {
    return SHOT03_RECOVERY_BREATH_CONTROL_PROFILE;
  }
  if (configured === SHOT03_RECOVERY_CHARACTER_ACTIVE_PROFILE) {
    return SHOT03_RECOVERY_CHARACTER_ACTIVE_PROFILE;
  }
  if (configured === SHOT03_RECOVERY_CHARACTER_CONTROL_PROFILE) {
    return SHOT03_RECOVERY_CHARACTER_CONTROL_PROFILE;
  }
  return 'cinematic';
}

function isRecoveryMotionProfile(
  profile: Shot03MotionProfile,
): profile is Shot03RecoveryMotionProfile {
  return (
    profile === SHOT03_RECOVERY_ACTIVE_PROFILE ||
    profile === SHOT03_RECOVERY_CAMERA_ONLY_PROFILE
  );
}

function isRecoveryBlinkProfile(
  profile: Shot03MotionProfile,
): profile is Shot03RecoveryBlinkProfile {
  return (
    profile === SHOT03_RECOVERY_BLINK_ACTIVE_PROFILE ||
    profile === SHOT03_RECOVERY_BLINK_CONTROL_PROFILE
  );
}

function isRecoveryBreathProfile(
  profile: Shot03MotionProfile,
): profile is Shot03RecoveryBreathProfile {
  return (
    profile === SHOT03_RECOVERY_BREATH_ACTIVE_PROFILE ||
    profile === SHOT03_RECOVERY_BREATH_CONTROL_PROFILE
  );
}

function isRecoveryCharacterProfile(
  profile: Shot03MotionProfile,
): profile is Shot03RecoveryCharacterProfile {
  return (
    profile === SHOT03_RECOVERY_CHARACTER_ACTIVE_PROFILE ||
    profile === SHOT03_RECOVERY_CHARACTER_CONTROL_PROFILE
  );
}

function isRecoveryAssetProfile(profile: Shot03MotionProfile): boolean {
  return (
    isRecoveryMotionProfile(profile) ||
    isRecoveryBlinkProfile(profile) ||
    isRecoveryBreathProfile(profile) ||
    isRecoveryCharacterProfile(profile)
  );
}

function resolveRecoverySourceAssets(): readonly PixiSourceAsset[] {
  if (typeof window === 'undefined') {
    throw new Error('Shot 3 recovery assets require a browser review session.');
  }
  const params = new URLSearchParams(window.location.search);
  const backgroundSha256 = requiredQueryParam(
    params,
    'shot03-recovery-background-sha256',
  );
  const vesselSha256 = requiredQueryParam(
    params,
    'shot03-recovery-vessel-sha256',
  );
  const enkiSha256 = requiredQueryParam(params, 'shot03-recovery-enki-sha256');
  const eyesSha256 = params.get('shot03-recovery-eyes-sha256')?.trim() || undefined;
  return buildShot03RecoverySourceAssets({
    backgroundSha256,
    vesselSha256,
    enkiSha256,
    eyesSha256,
  });
}

function requiredQueryParam(params: URLSearchParams, name: string): string {
  const value = params.get(name)?.trim();
  if (!value) throw new Error(`Shot 3 recovery review is missing query parameter ${name}.`);
  return value;
}

export function Shot03FullMotionCanvas({
  model,
  width,
  height,
  fps,
  durationFrames,
  sourceAssets,
}: {
  readonly model: RuntimePreviewModel;
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly durationFrames: number;
  readonly sourceAssets?: readonly PixiSourceAsset[];
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<PixiFullMotionSurface | null>(null);
  const motionProfile = useMemo(resolveMotionProfile, []);
  const recovery = isRecoveryAssetProfile(motionProfile);
  const resolvedSourceAssets = useMemo(
    () =>
      sourceAssets ??
      (recovery ? resolveRecoverySourceAssets() : SHOT03_FULL_MOTION_SOURCE_ASSETS),
    [sourceAssets, recovery],
  );
  const motion = useMemo(() => {
    if (motionProfile === SHOT03_SECONDARY_ISOLATION_PROFILE) {
      return buildShot03SecondaryMotionIsolationState(
        model.frame,
        fps,
        durationFrames,
      );
    }
    if (isRecoveryBlinkProfile(motionProfile)) {
      return buildShot03RecoveryBlinkMotionState(
        model.frame,
        fps,
        durationFrames,
        motionProfile,
      );
    }
    if (isRecoveryBreathProfile(motionProfile)) {
      return buildShot03RecoveryBreathMotionState(
        model.frame,
        fps,
        durationFrames,
        motionProfile,
      );
    }
    if (isRecoveryCharacterProfile(motionProfile)) {
      return buildShot03RecoveryCharacterMotionState(
        model.frame,
        fps,
        durationFrames,
        motionProfile,
      );
    }
    if (isRecoveryMotionProfile(motionProfile)) {
      return buildShot03RecoveryMotionState(
        model.frame,
        fps,
        durationFrames,
        motionProfile,
      );
    }
    return buildShot03FullMotionState(model.frame, fps, durationFrames);
  }, [model.frame, fps, durationFrames, motionProfile]);
  const frame = useMemo(
    () =>
      Object.freeze({
        frame: model.frame,
        width,
        height,
        sourceAssets: resolvedSourceAssets,
        sourceLayerStates: motion.sourceLayerStates,
      }),
    [model.frame, width, height, resolvedSourceAssets, motion.sourceLayerStates],
  );
  const frameRef = useRef(frame);
  const [status, setStatus] = useState<PixiMountStatus>('MOUNTING');
  const [error, setError] = useState<string | null>(null);
  frameRef.current = frame;

  const sourceAssetSignature = useMemo(
    () =>
      resolvedSourceAssets
        .map(
          (asset) =>
            `${asset.id}:${asset.sha256}:${asset.width}x${asset.height}:${asset.registration}`,
        )
        .join('|'),
    [resolvedSourceAssets],
  );
  const recoveryEyeCandidate = useMemo(
    () =>
      resolvedSourceAssets.some(
        (asset) =>
          asset.id === 'shot03-enki-eyes-v1' && asset.url === SHOT03_RECOVERY_EYES_URL,
      ),
    [resolvedSourceAssets],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      setStatus('ERROR');
      setError('Pixi full-motion preview host is unavailable.');
      return;
    }

    let disposed = false;
    let createdSurface: PixiFullMotionSurface | null = null;
    setStatus('MOUNTING');
    setError(null);

    void (async () => {
      try {
        const surface = await createPixiFullMotionSurface(
          width,
          height,
          frameRef.current.sourceAssets,
        );
        createdSurface = surface;
        if (disposed) {
          surface.destroy();
          return;
        }
        host.replaceChildren(surface.canvas);
        surfaceRef.current = surface;
        surface.render(frameRef.current);
        setStatus('READY');
      } catch (reason) {
        if (disposed) return;
        setError(reason instanceof Error ? reason.message : String(reason));
        setStatus('ERROR');
      }
    })();

    return () => {
      disposed = true;
      if (surfaceRef.current === createdSurface) surfaceRef.current = null;
      createdSurface?.destroy();
      host.replaceChildren();
    };
  }, [width, height, sourceAssetSignature]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    try {
      surface.render(frame);
      setStatus('READY');
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      setStatus('ERROR');
    }
  }, [frame]);

  const isolation = motionProfile === SHOT03_SECONDARY_ISOLATION_PROFILE;
  const cameraOnly = motionProfile === SHOT03_RECOVERY_CAMERA_ONLY_PROFILE;
  const blinkReview = isRecoveryBlinkProfile(motionProfile);
  const blinkControl = motionProfile === SHOT03_RECOVERY_BLINK_CONTROL_PROFILE;
  const breathReview = isRecoveryBreathProfile(motionProfile);
  const breathControl = motionProfile === SHOT03_RECOVERY_BREATH_CONTROL_PROFILE;
  const characterReview = isRecoveryCharacterProfile(motionProfile);
  const characterControl =
    motionProfile === SHOT03_RECOVERY_CHARACTER_CONTROL_PROFILE;
  const character =
    'character' in motion
      ? motion.character
      : { x: 0, y: 0, rotationDegrees: 0, lagSeconds: 0 };
  const breath =
    'breath' in motion
      ? motion.breath
      : { amount: 0, scaleX: 1, scaleY: 1, cycleFrames: 0 };
  const hiddenRecoveryLayers = blinkReview
    ? 'shot03-water-v1,shot03-rigging-v1'
    : recovery
      ? 'shot03-water-v1,shot03-enki-eyes-v1,shot03-rigging-v1'
      : '';

  return (
    <div className={previewStyles.pixiFrame}>
      <div
        ref={hostRef}
        className={previewStyles.pixiHost}
        style={{ aspectRatio: `${width} / ${height}` }}
        data-pixi-state={status}
        data-pixi-error={error ?? ''}
        data-pixi-frame={frame.frame}
        data-pixi-source-asset-count={frame.sourceAssets.length}
        data-pixi-review-mode={
          breathReview
            ? 'recovered-breath-motion'
            : characterReview
              ? 'recovered-character-motion'
              : blinkReview
                ? 'recovered-blink-motion'
                : recovery
                  ? 'recovered-primary-motion'
                  : 'full-motion'
        }
        data-pixi-review-composition={
          breathReview
            ? 'shot03-recovered-character-plus-breath'
            : characterReview
              ? 'shot03-recovered-primary-plus-character-settle'
              : blinkReview
                ? 'shot03-recovered-primary-plus-blink'
                : recovery
                  ? 'shot03-recovered-primary-layers'
                  : 'shot03-full-motion-layers'
        }
        data-shot03-motion-profile={motionProfile}
        data-shot03-camera={`x=${motion.camera.x.toFixed(3)},y=${motion.camera.y.toFixed(3)},scale=${motion.camera.scale.toFixed(6)}`}
        data-shot03-vessel={`heave=${motion.vessel.heaveY.toFixed(3)},roll=${motion.vessel.rollDegrees.toFixed(6)}`}
        data-shot03-enki-local={`x=${character.x.toFixed(3)},y=${character.y.toFixed(3)},rot=${character.rotationDegrees.toFixed(6)},lag=${character.lagSeconds.toFixed(3)}`}
        data-shot03-breath={`amount=${breath.amount.toFixed(6)},scaleX=${breath.scaleX.toFixed(6)},scaleY=${breath.scaleY.toFixed(6)},cycle=${breath.cycleFrames}`}
        data-shot03-rigging={`x=${motion.rigging.x.toFixed(3)},y=${motion.rigging.y.toFixed(3)},rot=${motion.rigging.rotationDegrees.toFixed(6)},lag=${motion.rigging.lagSeconds.toFixed(3)}`}
        data-shot03-blink-opacity={motion.blinkOpacity.toFixed(3)}
        data-shot03-recovery-hidden-layers={hiddenRecoveryLayers}
        data-shot03-recovery-eye-source={
          recovery ? (recoveryEyeCandidate ? 'candidate' : 'canonical') : ''
        }
        data-shot03-recovery-control={
          breathReview
            ? breathControl
              ? 'breath-control'
              : 'breath-active'
            : characterReview
              ? characterControl
                ? 'character-control'
                : 'character-active'
              : cameraOnly
                ? 'camera-only'
                : blinkReview
                  ? blinkControl
                    ? 'blink-control'
                    : 'blink-active'
                  : recovery
                    ? 'active'
                    : ''
        }
        aria-label="Pixi Shot 3 full-motion renderer"
      />
      <div className={previewStyles.pixiStatus} aria-live="polite">
        <strong>PIXI {status}</strong>
        <span>
          {breathReview
            ? breathControl
              ? 'accepted Enki counter-sway matched breathing control'
              : 'accepted Enki counter-sway + breathe-calm review'
            : characterReview
              ? characterControl
                ? 'recovered character-motion matched control'
                : 'recovered primary motion + Enki counter-sway review'
              : blinkReview
                ? blinkControl
                  ? 'recovered blink-disabled matched control'
                  : 'recovered primary motion + blink review'
                : recovery
                  ? cameraOnly
                    ? 'recovered primary-layer camera-only control'
                    : 'recovered primary-layer motion review'
                  : isolation
                    ? 'secondary-motion isolation review'
                    : 'full 7-second motion review'}
        </span>
        <span>
          {breathReview
            ? breathControl
              ? 'accepted camera + vessel + Enki counter-sway; breathing deformation disabled'
              : 'accepted camera + vessel + Enki counter-sway; torso-anchored anisotropic breathe-calm deformation added'
            : characterReview
              ? characterControl
                ? 'accepted camera + vessel motion; Enki remains rigidly vessel-carried'
                : 'accepted camera + vessel motion; Enki adds bounded delayed counter-sway'
              : blinkReview
                ? blinkControl
                  ? 'same camera + vessel/Enki motion; closed-eye overlay disabled'
                  : 'same camera + vessel/Enki motion; closed-eye overlay follows canonical blink timing'
                : recovery
                  ? cameraOnly
                    ? 'camera only; vessel/Enki remain locally frozen'
                    : 'camera + vessel/Enki rigid-group heave/roll'
                  : isolation
                    ? 'camera frozen + exaggerated vessel/rigging diagnostic'
                    : 'camera + vessel + delayed rigging + blink state'}
        </span>
        <span>manual-exact-frame</span>
        <span>ticker stopped</span>
        <span>{frame.sourceAssets.length} checksum-bound source assets</span>
        <span>
          {breathReview
            ? 'blink/water/legacy rigging hidden; accepted counter-sway frozen underneath breathe-calm'
            : characterReview
              ? 'blink/water/legacy rigging hidden; only recovered Enki local motion is added'
              : blinkReview
                ? recoveryEyeCandidate
                  ? 'replacement blink candidate; legacy water/rigging hidden'
                  : 'canonical blink; legacy water/rigging hidden'
                : recovery
                  ? 'legacy water/rigging/blink layers hidden; repaired background remains source-baked'
                  : 'water held static for this proof'}
        </span>
        {error ? <code>{error}</code> : null}
      </div>
    </div>
  );
}
