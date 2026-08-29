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
 * into feathered horizontal bands over the lower water field and moves those
 * bands by a restrained, depth-weighted envelope. It never generates pixels,
 * replaces assets, or mutates the canonical animation manifest.
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
  const horizontalAmplitude = surface.horizontalCurrent * 18;
  const verticalAmplitude = surface.verticalRipple * 6;
  const cyclesPerSecond = 0.1 + surface.flowSpeed * 0.3;
  const bandCount = Math.round(5 + surface.rippleScale * 8);
  const waterTop = 55;
  const waterHeight = 45;
  const bandHeight = waterHeight / bandCount;

  return (
    <div style={styles.field} aria-hidden="true">
      {Array.from({ length: bandCount }, (_unused, index) => {
        const top = waterTop + index * bandHeight;
        const bottom = Math.min(100, top + bandHeight + 1.1);
        const feather = Math.min(3.4, Math.max(1.2, bandHeight * 0.46));
        const normalizedDepth = bandCount <= 1 ? 1 : index / (bandCount - 1);
        const depthResponse = 0.48 + normalizedDepth * 0.72;
        const phase = index * (0.52 + surface.rippleScale * 0.5);
        const primary = (seconds * cyclesPerSecond + phase) * Math.PI * 2;
        const secondary =
          (seconds * cyclesPerSecond * 0.47 + phase * 1.61) * Math.PI * 2;
        const tertiary =
          (seconds * cyclesPerSecond * 0.23 + phase * 2.17) * Math.PI * 2;
        const x =
          (Math.sin(primary) * horizontalAmplitude +
            Math.sin(secondary) * horizontalAmplitude * 0.34 +
            Math.sin(tertiary) * horizontalAmplitude * 0.12) *
          depthResponse;
        const y =
          (Math.cos(primary * 0.71) * verticalAmplitude +
            Math.sin(secondary * 0.83) * verticalAmplitude * 0.22) *
          (0.42 + normalizedDepth * 0.58);
        const scale = 1.012 + surface.horizontalCurrent * 0.008;
        const mask = `linear-gradient(to bottom, transparent 0%, transparent ${Math.max(
          0,
          top - feather,
        )}%, black ${top}%, black ${bottom}%, transparent ${Math.min(
          100,
          bottom + feather,
        )}%, transparent 100%)`;

        return (
          <Img
            key={index}
            src={baseAsset}
            style={{
              ...styles.slice,
              opacity: 0.98 + surface.horizontalCurrent * 0.02,
              transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
              maskImage: mask,
              WebkitMaskImage: mask,
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
