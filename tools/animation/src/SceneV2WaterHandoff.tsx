import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { SceneV2Benchmark } from './SceneV2Benchmark';
import { clamp, type SceneV2 } from './scene-v2';

export interface WaterMaterialHandoffConfig {
  type: 'waterMaterialHandoff';
  preRollFrames: number;
  postRollFrames: number;
  coverPeak: number;
  refractionStrength: number;
  coolShift: number;
  materialContinuityRequired: boolean;
  genericDissolveAllowed: boolean;
}

export interface SceneV2WaterHandoffProps {
  outgoingScene?: SceneV2;
  incomingScene?: SceneV2;
  transition?: WaterMaterialHandoffConfig;
  showReviewGuides?: boolean;
}

export function SceneV2WaterHandoff({
  outgoingScene,
  incomingScene,
  transition,
  showReviewGuides = false,
}: SceneV2WaterHandoffProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!outgoingScene || !incomingScene || !transition) {
    return <AbsoluteFill style={{ backgroundColor: '#061317' }} />;
  }

  const cutFrame = outgoingScene.durationFrames;
  const transitionStart = cutFrame - transition.preRollFrames;
  const transitionEnd = cutFrame + transition.postRollFrames;

  return (
    <AbsoluteFill style={{ backgroundColor: '#061317', overflow: 'hidden' }}>
      <Sequence from={0} durationInFrames={outgoingScene.durationFrames}>
        <SceneV2Benchmark
          scene={outgoingScene}
          showReviewGuides={showReviewGuides}
        />
      </Sequence>
      <Sequence
        from={cutFrame}
        durationInFrames={incomingScene.durationFrames}
      >
        <SceneV2Benchmark
          scene={incomingScene}
          showReviewGuides={showReviewGuides}
        />
      </Sequence>
      {frame >= transitionStart && frame < transitionEnd ? (
        <WaterMaterialHandoff
          frame={frame}
          fps={fps}
          cutFrame={cutFrame}
          config={transition}
        />
      ) : null}
    </AbsoluteFill>
  );
}

function WaterMaterialHandoff({
  frame,
  fps,
  cutFrame,
  config,
}: {
  frame: number;
  fps: number;
  cutFrame: number;
  config: WaterMaterialHandoffConfig;
}) {
  const before = frame <= cutFrame;
  const local = before
    ? clamp(
        (frame - (cutFrame - config.preRollFrames)) /
          Math.max(1, config.preRollFrames),
        0,
        1,
      )
    : clamp(
        1 - (frame - cutFrame) / Math.max(1, config.postRollFrames),
        0,
        1,
      );
  const materialCover = smoothstep(0, 1, local) * config.coverPeak;
  const refraction = smoothstep(0.18, 1, local) * config.refractionStrength;
  const cool = smoothstep(0.34, 1, local) * config.coolShift;
  const phase = frame / fps;
  const driftA = Math.sin(phase * 1.37) * 46 + Math.sin(phase * 0.53) * 22;
  const driftB = Math.cos(phase * 0.91 + 0.7) * 38;
  const vertical = Math.sin(phase * 0.67 + 1.2) * 16;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          inset: '-8%',
          opacity: materialCover * 0.76,
          transform: `translate3d(${driftA}px, ${vertical}px, 0) scale(${1.02 + refraction * 0.025})`,
          background:
            'repeating-linear-gradient(178deg, transparent 0 34px, rgba(146,200,202,0.30) 38px 45px, transparent 49px 86px)',
          filter: `blur(${12 - refraction * 4}px)`,
          mixBlendMode: 'screen',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: '-10%',
          opacity: materialCover * 0.55,
          transform: `translate3d(${driftB}px, ${-vertical * 0.7}px, 0) rotate(${Math.sin(phase * 0.41) * 0.7}deg)`,
          background:
            'repeating-linear-gradient(184deg, transparent 0 47px, rgba(48,105,117,0.34) 51px 61px, transparent 66px 111px)',
          filter: `blur(${18 - refraction * 5}px)`,
          mixBlendMode: 'soft-light',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '-18%',
          right: '-18%',
          top: `${54 - materialCover * 22}%`,
          height: `${38 + materialCover * 32}%`,
          opacity: materialCover,
          transform: `translate3d(${driftA * -0.35}px, 0, 0)`,
          background:
            'radial-gradient(ellipse at 50% 46%, rgba(178,216,214,0.34) 0%, rgba(55,112,123,0.30) 34%, rgba(7,40,51,0.44) 67%, transparent 82%)',
          filter: `blur(${20 - refraction * 6}px)`,
          mixBlendMode: 'screen',
        }}
      />
      <AbsoluteFill
        style={{
          opacity: cool * 0.54,
          background:
            'linear-gradient(180deg, rgba(8,38,49,0.18) 0%, rgba(10,60,69,0.22) 48%, rgba(22,83,86,0.15) 100%)',
          mixBlendMode: 'color',
        }}
      />
      <AbsoluteFill
        style={{
          opacity: refraction * 0.16,
          background:
            'radial-gradient(ellipse at 52% 58%, transparent 0%, rgba(204,230,220,0.16) 48%, rgba(7,27,35,0.30) 100%)',
          filter: 'blur(6px)',
          mixBlendMode: 'soft-light',
        }}
      />
    </AbsoluteFill>
  );
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
