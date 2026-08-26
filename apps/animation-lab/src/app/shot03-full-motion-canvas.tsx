import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createPixiFullMotionSurface,
  type PixiFullMotionSurface,
  type PixiSourceAsset,
} from '@sumer-reel-forge/animation-pixi';
import previewStyles from './runtime-preview-panel.module.css';
import type { RuntimePreviewModel } from './runtime-preview';
import { buildShot03FullMotionState } from './shot03-full-motion';
import { SHOT03_FULL_MOTION_SOURCE_ASSETS } from './shot03-source-backed-asset';

type PixiMountStatus = 'MOUNTING' | 'READY' | 'ERROR';

export function Shot03FullMotionCanvas({
  model,
  width,
  height,
  fps,
  durationFrames,
  sourceAssets = SHOT03_FULL_MOTION_SOURCE_ASSETS,
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
  const motion = useMemo(
    () => buildShot03FullMotionState(model.frame, fps, durationFrames),
    [model.frame, fps, durationFrames],
  );
  const frame = useMemo(
    () =>
      Object.freeze({
        frame: model.frame,
        width,
        height,
        sourceAssets,
        sourceLayerStates: motion.sourceLayerStates,
      }),
    [model.frame, width, height, sourceAssets, motion.sourceLayerStates],
  );
  const frameRef = useRef(frame);
  const [status, setStatus] = useState<PixiMountStatus>('MOUNTING');
  const [error, setError] = useState<string | null>(null);
  frameRef.current = frame;

  const sourceAssetSignature = useMemo(
    () =>
      sourceAssets
        .map((asset) => `${asset.id}:${asset.sha256}:${asset.width}x${asset.height}:${asset.registration}`)
        .join('|'),
    [sourceAssets],
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
        const surface = await createPixiFullMotionSurface(width, height, frameRef.current.sourceAssets);
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
        data-pixi-review-mode="full-motion"
        data-pixi-review-composition="shot03-full-motion-layers"
        data-shot03-camera={`x=${motion.camera.x.toFixed(3)},y=${motion.camera.y.toFixed(3)},scale=${motion.camera.scale.toFixed(6)}`}
        data-shot03-vessel={`heave=${motion.vessel.heaveY.toFixed(3)},roll=${motion.vessel.rollDegrees.toFixed(6)}`}
        data-shot03-rigging={`x=${motion.rigging.x.toFixed(3)},y=${motion.rigging.y.toFixed(3)},rot=${motion.rigging.rotationDegrees.toFixed(6)},lag=${motion.rigging.lagSeconds.toFixed(3)}`}
        data-shot03-blink-opacity={motion.blinkOpacity.toFixed(3)}
        aria-label="Pixi Shot 3 full-motion renderer"
      />
      <div className={previewStyles.pixiStatus} aria-live="polite">
        <strong>PIXI {status}</strong>
        <span>full 7-second motion review</span>
        <span>camera + vessel + delayed rigging + blink state</span>
        <span>manual-exact-frame</span>
        <span>ticker stopped</span>
        <span>{frame.sourceAssets.length} checksum-bound source assets</span>
        <span>water held static for this proof</span>
        {error ? <code>{error}</code> : null}
      </div>
    </div>
  );
}
