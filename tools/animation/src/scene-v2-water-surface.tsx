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
 * bands by a few pixels. It never generates pixels, replaces assets, or mutates
 * the canonical animation manifest.
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
  const horizontalAmplitude = surface.horizontalCurrent * 8;
  const verticalAmplitude = surface.verticalRipple * 3.2;
  const cyclesPerSecond = 0.08 + surface.flowSpeed * 0.2;
  const bandCount = Math.round(4 + surface.rippleScale * 6);
  const waterTop = 55;
  const waterHeight = 45;
  const bandHeight = waterHeight / bandCount;

  return (
    <div style={styles.field} aria-hidden="true">
      {Array.from({ length: bandCount }, (_unused, index) => {
        const top = waterTop + index * bandHeight;
        const bottom = Math.min(100, top + bandHeight + 0.8);
        const feather = Math.min(2.4, Math.max(0.9, bandHeight * 0.34));
        const phase = index * (0.58 + surface.rippleScale * 0.42);
        const primary = (seconds * cyclesPerSecond + phase) * Math.PI * 2;
        const secondary =
          (seconds * cyclesPerSecond * 0.43 + phase * 1.73) * Math.PI * 2;
        const x =
          Math.sin(primary) * horizontalAmplitude +
          Math.sin(secondary) * horizontalAmplitude * 0.28;
        const y = Math.cos(primary * 0.73) * verticalAmplitude;
        const scale = 1.003 + surface.horizontalCurrent * 0.0015;
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
              opacity: 0.94 + surface.horizontalCurrent * 0.04,
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
