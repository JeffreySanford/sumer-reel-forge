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
  const settle = progress > 0.88 ? Math.max(0.35, 1 - (progress - 0.88) / 0.12) : 1;

  const textureX =
    (Math.sin(phase * 1.13 + 0.4) * 1.9 + Math.sin(phase * 0.47 + 1.2) * 0.9) *
    settle;
  const textureY = Math.cos(phase * 0.71 + 0.8) * 0.45 * settle;
  const textureScaleX = 1 + Math.sin(phase * 0.63 + 0.2) * 0.0018 * settle;
  const textureScaleY = 1 + Math.cos(phase * 0.41 + 1.4) * 0.0012 * settle;

  const glintDrift =
    (Math.sin(phase * 0.79) * 22 + Math.sin(phase * 0.31 + 1.1) * 11) * settle;
  const counterDrift =
    (Math.cos(phase * 0.53 + 0.6) * 17 + Math.sin(phase * 0.23) * 8) * settle;

  const maskStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
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

  return (
    <>
      <Img
        src={source}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.2,
          mixBlendMode: 'soft-light',
          filter: 'contrast(1.08) brightness(1.03) saturate(1.04)',
          transformOrigin: '53% 82%',
          transform: `translate3d(${textureX}px, ${textureY}px, 0) scaleX(${textureScaleX}) scaleY(${textureScaleY})`,
          willChange: 'transform, opacity, filter',
        }}
      />
      <div
        style={{
          ...maskStyle,
          opacity: 0.2 + Math.sin(phase * 0.58 + 0.4) * 0.035,
          mixBlendMode: 'screen',
          background:
            'repeating-linear-gradient(103deg, transparent 0 34px, rgba(255,236,188,0.24) 39px 43px, transparent 49px 78px)',
          filter: 'blur(1.5px)',
          transform: `translate3d(${glintDrift}px, 0, 0)`,
          willChange: 'transform, opacity',
        }}
      />
      <div
        style={{
          ...maskStyle,
          opacity: 0.13 + Math.cos(phase * 0.43 + 1.3) * 0.025,
          mixBlendMode: 'soft-light',
          background:
            'repeating-linear-gradient(82deg, transparent 0 46px, rgba(118,176,184,0.22) 52px 58px, transparent 64px 102px)',
          filter: 'blur(2.4px)',
          transform: `translate3d(${counterDrift}px, ${Math.sin(phase * 0.37) * 1.4}px, 0)`,
          willChange: 'transform, opacity',
        }}
      />
    </>
  );
}
