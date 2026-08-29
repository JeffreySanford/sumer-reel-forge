import React from 'react';
import { Img } from 'remotion';
import type { SceneV2Shot } from './scene-v2';

export interface SceneV2WaterSurfaceMotionProps {
  shot: SceneV2Shot;
  frame: number;
  fps: number;
  baseAsset: string;
}

/**
 * Source-preserving water motion for flattened editorial art.
 *
 * The approved source remains the only image. The effect duplicates that source
 * into clipped horizontal bands over the visible water field and moves those
 * bands with four independently visible controls. The horizon remains protected,
 * while far, middle, and foreground water all receive readable motion. It never
 * generates pixels, replaces assets, or mutates the canonical animation manifest.
 */
export function SceneV2WaterSurfaceMotion({
  shot,
  frame,
  fps,
  baseAsset,
}: SceneV2WaterSurfaceMotionProps) {
  const surface = shot.waterSurface;
  if (!surface?.enabled) return null;

  const seconds = frame / Math.max(1, fps);

  // Keep each normalized control visually independent across its full 0..1 range:
  // horizontalCurrent = lateral travel, verticalRipple = vertical displacement,
  // flowSpeed = temporal rate, rippleScale = spatial frequency / band density.
  const horizontalAmplitude = surface.horizontalCurrent * 24;
  const verticalAmplitude = surface.verticalRipple * 12;
  const cyclesPerSecond = 0.04 + surface.flowSpeed * 0.56;
  const bandCount = Math.round(3 + surface.rippleScale * 15);
  const phaseSpacing = 0.35 + surface.rippleScale * 1.35;

  // Shot 1's approved painting places the readable water below roughly the
  // mid-lower horizon. Keep the clip below that boundary and spread the motion
  // more evenly through the water instead of concentrating it at the bottom.
  const waterTop = 55;
  const waterHeight = 45;
  const bandHeight = waterHeight / bandCount;

  return (
    <div style={styles.field} aria-hidden="true">
      {Array.from({ length: bandCount }, (_unused, index) => {
        const top = waterTop + index * bandHeight;
        const bottom = Math.min(100, top + bandHeight);
        const overlap = Math.min(1.2, Math.max(0.35, bandHeight * 0.16));
        const normalizedDepth = bandCount <= 1 ? 1 : index / (bandCount - 1);

        // Keep the horizon water calmer, but not nearly static. Far water now
        // receives 65% of the envelope, rising smoothly to 100% foreground.
        const depthResponse = 0.65 + normalizedDepth * 0.35;
        const verticalDepthResponse = 0.55 + normalizedDepth * 0.45;
        const phase = index * phaseSpacing;
        const primary = (seconds * cyclesPerSecond + phase) * Math.PI * 2;
        const secondary =
          (seconds * cyclesPerSecond * 0.47 + phase * 1.61) * Math.PI * 2;
        const tertiary =
          (seconds * cyclesPerSecond * 0.23 + phase * 2.17) * Math.PI * 2;
        const x =
          (Math.sin(primary) * horizontalAmplitude +
            Math.sin(secondary) * horizontalAmplitude * 0.32 +
            Math.sin(tertiary) * horizontalAmplitude * 0.1) *
          depthResponse;
        const y =
          (Math.cos(primary * 0.71) * verticalAmplitude +
            Math.sin(secondary * 0.83) * verticalAmplitude * 0.28) *
          verticalDepthResponse;
        const scale =
          1.018 + surface.horizontalCurrent * 0.012 + surface.verticalRipple * 0.004;
        const clipTop = Math.max(0, top - overlap);
        const clipBottom = Math.min(100, bottom + overlap);
        const clip = `inset(${clipTop}% 0 ${Math.max(
          0,
          100 - clipBottom,
        )}% 0)`;

        return (
          <Img
            key={index}
            src={baseAsset}
            style={{
              ...styles.slice,
              opacity: 1,
              transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
              clipPath: clip,
              WebkitClipPath: clip,
            }}
          />
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  field: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  slice: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transformOrigin: '50% 70%',
    willChange: 'transform',
  },
};
