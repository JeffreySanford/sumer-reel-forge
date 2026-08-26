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
} from './shot03-source-backed-asset';

type PixiMountStatus = 'MOUNTING' | 'READY' | 'ERROR';
type Shot03MotionProfile =
  | 'cinematic'
  | typeof SHOT03_SECONDARY_ISOLATION_PROFILE
  | Shot03RecoveryMotionProfile;

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
  return 'cinematic';
}

function isRecoveryProfile(
  profile: Shot03MotionProfile,
): profile is Shot03RecoveryMotionProfile {
  return (
    profile === SHOT03_RECOVERY_ACTIVE_PROFILE ||
    profile === SHOT03_RECOVERY_CAMERA_ONLY_PROFILE
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
  return buildShot03RecoverySourceAssets({
    backgroundSha256,
    vesselSha256,
    enkiSha256,
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
  const recovery = isRecoveryProfile(motionProfile);
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
    if (isRecoveryProfile(motionProfile)) {
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
        data-pixi-review-mode={recovery ? 'recovered-primary-motion' : 'full-motion'}
        data-pixi-review-composition={
          recovery ? 'shot03-recovered-primary-layers' : 'shot03-full-motion-layers'
        }
        data-shot03-motion-profile={motionProfile}
        data-shot03-camera={`x=${motion.camera.x.toFixed(3)},y=${motion.camera.y.toFixed(3)},scale=${motion.camera.scale.toFixed(6)}`}
        data-shot03-vessel={`heave=${motion.vessel.heaveY.toFixed(3)},roll=${motion.vessel.rollDegrees.toFixed(6)}`}
        data-shot03-rigging={`x=${motion.rigging.x.toFixed(3)},y=${motion.rigging.y.toFixed(3)},rot=${motion.rigging.rotationDegrees.toFixed(6)},lag=${motion.rigging.lagSeconds.toFixed(3)}`}
        data-shot03-blink-opacity={motion.blinkOpacity.toFixed(3)}
        data-shot03-recovery-hidden-layers={
          recovery ? 'shot03-water-v1,shot03-enki-eyes-v1,shot03-rigging-v1' : ''
        }
        data-shot03-recovery-control={cameraOnly ? 'camera-only' : recovery ? 'active' : ''}
        aria-label="Pixi Shot 3 full-motion renderer"
      />
      <div className={previewStyles.pixiStatus} aria-live="polite">
        <strong>PIXI {status}</strong>
        <span>
          {recovery
            ? cameraOnly
              ? 'recovered primary-layer camera-only control'
              : 'recovered primary-layer motion review'
            : isolation
              ? 'secondary-motion isolation review'
              : 'full 7-second motion review'}
        </span>
        <span>
          {recovery
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
          {recovery
            ? 'legacy water/rigging/blink layers hidden; repaired background remains source-baked'
            : 'water held static for this proof'}
        </span>
        {error ? <code>{error}</code> : null}
      </div>
    </div>
  );
}
