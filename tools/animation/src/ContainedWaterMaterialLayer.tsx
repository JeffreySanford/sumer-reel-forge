import React from 'react';
import { Img, staticFile } from 'remotion';
import type { SceneV2Layer } from './scene-v2';

export function ContainedWaterMaterialLayer({
  layer,
  frame,
  progress,
  fps,
}: {
  layer: SceneV2Layer;
  frame: number;
  progress: number;
  fps: number;
}) {
  const phase = frame / fps;
  const source = staticFile(layer.assetPath);
  const settle =
    progress > 0.88
      ? Math.max(0.4, 1 - (progress - 0.88) / 0.12)
      : 1;

  const primaryX =
    (Math.sin(phase * 0.92 + 0.35) * 5.4 +
      Math.sin(phase * 0.37 + 1.25) * 2.4) *
    settle;
  const primaryY =
    (Math.cos(phase * 0.61 + 0.8) * 2.1 +
      Math.sin(phase * 0.29 + 0.2) * 0.8) *
    settle;
  const primaryScaleX =
    1.008 + Math.sin(phase * 0.51 + 0.15) * 0.004 * settle;
  const primaryScaleY =
    1.006 + Math.cos(phase * 0.43 + 1.1) * 0.003 * settle;

  const secondaryX =
    (Math.cos(phase * 0.57 + 1.5) * 4.2 +
      Math.sin(phase * 0.24 + 0.6) * 1.8) *
    settle;
  const secondaryY =
    (Math.sin(phase * 0.48 + 0.4) * 1.5 -
      Math.cos(phase * 0.22 + 1.3) * 0.7) *
    settle;

  const glintDrift =
    (Math.sin(phase * 0.86) * 34 +
      Math.sin(phase * 0.31 + 1.1) * 17) *
    settle;
  const counterDrift =
    (Math.cos(phase * 0.59 + 0.6) * 28 +
      Math.sin(phase * 0.27) * 12) *
    settle;

  const maskStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    maskImage: `url("${source}")`,
    WebkitMaskImage: `url("${source}")`,
    maskSize: 'cover',
    WebkitMaskSize: 'cover',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    pointerEvents: 'none',
  };

  const movingTexture: React.CSSProperties = {
    position: 'absolute',
    inset: '-1.5%',
    width: '103%',
    height: '103%',
    objectFit: 'cover',
    transformOrigin: '53% 82%',
    willChange: 'transform, opacity, filter',
  };

  return (
    <>
      <div style={maskStyle}>
        <Img
          src={source}
          style={{
            ...movingTexture,
            opacity: 0.62,
            mixBlendMode: 'normal',
            filter: 'contrast(1.09) brightness(1.035) saturate(1.07)',
            transform: `translate3d(${primaryX}px, ${primaryY}px, 0) scaleX(${primaryScaleX}) scaleY(${primaryScaleY})`,
          }}
        />
        <Img
          src={source}
          style={{
            ...movingTexture,
            opacity: 0.3,
            mixBlendMode: 'screen',
            filter: 'contrast(1.12) brightness(1.04) saturate(0.96) blur(0.35px)',
            transform: `translate3d(${secondaryX}px, ${secondaryY}px, 0) scale(${1.006 + Math.sin(phase * 0.34 + 0.9) * 0.0025 * settle})`,
          }}
        />
      </div>

      <div
        style={{
          ...maskStyle,
          opacity: 0.34 + Math.sin(phase * 0.64 + 0.4) * 0.055,
          mixBlendMode: 'screen',
          background:
            'repeating-linear-gradient(103deg, transparent 0 27px, rgba(255,238,194,0.33) 32px 37px, transparent 43px 68px)',
          filter: 'blur(1.15px)',
          transform: `translate3d(${glintDrift}px, ${Math.sin(phase * 0.42) * 1.8}px, 0)`,
          willChange: 'transform, opacity',
        }}
      />

      <div
        style={{
          ...maskStyle,
          opacity: 0.23 + Math.cos(phase * 0.47 + 1.3) * 0.04,
          mixBlendMode: 'soft-light',
          background:
            'repeating-linear-gradient(81deg, transparent 0 39px, rgba(119,184,191,0.31) 45px 52px, transparent 59px 88px)',
          filter: 'blur(1.9px)',
          transform: `translate3d(${counterDrift}px, ${Math.sin(phase * 0.39 + 0.5) * 2.1}px, 0)`,
          willChange: 'transform, opacity',
        }}
      />
    </>
  );
}
