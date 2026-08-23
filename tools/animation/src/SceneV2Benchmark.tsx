import React from 'react';
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  assertSceneV2,
  cinematicSlow,
  clamp,
  interpolateNumber,
  type SceneV2,
  type SceneV2Shot,
} from './scene-v2';

export interface SceneV2BenchmarkProps {
  scene?: SceneV2;
  showReviewGuides?: boolean;
}

export function SceneV2Benchmark({
  scene,
  showReviewGuides = false,
}: SceneV2BenchmarkProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!scene?.shots?.length) {
    return <AbsoluteFill style={{ backgroundColor: '#081418' }} />;
  }

  assertSceneV2(scene);
  const shot = shotForFrame(scene, frame) ?? scene.shots[0];
  const localFrame = clamp(frame - shot.startFrame, 0, shot.durationFrames - 1);
  const progress = clamp(localFrame / Math.max(1, shot.durationFrames - 1), 0, 1);
  const cameraProgress = cinematicSlow(progress, shot.camera.settleFromProgress);
  const baseLayer = shot.layers.find((layer) => layer.required) ?? shot.layers[0];
  const baseAsset = staticFile(baseLayer.assetPath);

  const scale = interpolateNumber(
    shot.camera.scaleFrom,
    shot.camera.scaleTo,
    cameraProgress,
  );
  const x = interpolateNumber(shot.camera.xFrom, shot.camera.xTo, cameraProgress);
  const y = interpolateNumber(shot.camera.yFrom, shot.camera.yTo, cameraProgress);
  const rotation = interpolateNumber(
    shot.camera.rotationFrom,
    shot.camera.rotationTo,
    cameraProgress,
  );

  const heavyPhysical = baseLayer.motionPresets.includes('heavyPhysical');
  const boatPhase = frame / (fps * 1.85);
  const physicalY = heavyPhysical ? Math.sin(boatPhase * Math.PI * 2) * 1.7 : 0;
  const physicalRotation = heavyPhysical
    ? Math.sin((boatPhase + 0.18) * Math.PI * 2) * 0.045
    : 0;
  const settleWeight = progress > 0.75 ? 1 - (progress - 0.75) / 0.25 : 1;

  return (
    <AbsoluteFill style={styles.root}>
      <div
        style={{
          ...styles.camera,
          transform: `translate3d(${x}px, ${y + physicalY * settleWeight}px, 0) scale(${scale}) rotate(${rotation + physicalRotation * settleWeight}deg)`,
        }}
      >
        <Img src={baseAsset} style={styles.artwork} />
        <WaterReflection shot={shot} frame={frame} progress={progress} fps={fps} />
        <Atmosphere shot={shot} frame={frame} progress={progress} fps={fps} />
        <SuspendedDepth shot={shot} frame={frame} progress={progress} fps={fps} />
        <NuminousCoherence
          shot={shot}
          frame={frame}
          progress={progress}
          fps={fps}
          baseAsset={baseAsset}
        />
        <ReflectedLight shot={shot} frame={frame} progress={progress} fps={fps} />
      </div>
      <CinematicGrade shot={shot} progress={progress} />
      {showReviewGuides ? <ReviewGuide scene={scene} progress={progress} /> : null}
    </AbsoluteFill>
  );
}

function WaterReflection({
  shot,
  frame,
  progress,
  fps,
}: {
  shot: SceneV2Shot;
  frame: number;
  progress: number;
  fps: number;
}) {
  const light = shot.lighting.find((item) => item.preset === 'waterPulse');
  if (!light) return null;

  const underwater = hasNuminousCoherence(shot);
  const intensity = interpolateNumber(
    light.intensityFrom,
    light.intensityTo,
    cinematicSlow(progress, underwater ? 0.92 : 0.86),
  );
  const slowDrift =
    Math.sin(frame / (fps * (underwater ? 1.9 : 1.35))) * (underwater ? 11 : 18) +
    Math.sin(frame / (fps * 3.7)) * (underwater ? 4 : 0);
  const shimmer =
    0.84 + Math.sin(frame / (fps * (underwater ? 0.71 : 0.43))) * (underwater ? 0.08 : 0.16);

  return (
    <div style={underwater ? styles.deepWaterWindow : styles.waterWindow}>
      <div
        style={{
          ...styles.waterBandA,
          opacity: intensity * shimmer,
          transform: `translate3d(${slowDrift}px, 0, 0)`,
        }}
      />
      <div
        style={{
          ...styles.waterBandB,
          opacity: intensity * (underwater ? 0.48 : 0.62),
          transform: `translate3d(${-slowDrift * 0.66}px, 0, 0)`,
        }}
      />
      {underwater ? (
        <div
          style={{
            ...styles.deepWaterBand,
            opacity: intensity * 0.42,
            transform: `translate3d(${Math.sin(frame / (fps * 2.83)) * 7}px, ${Math.sin(frame / (fps * 4.1)) * 4}px, 0)`,
          }}
        />
      ) : null}
    </div>
  );
}

function Atmosphere({
  shot,
  frame,
  progress,
  fps,
}: {
  shot: SceneV2Shot;
  frame: number;
  progress: number;
  fps: number;
}) {
  const mist = shot.atmosphere.find((item) => item.preset === 'mistDrift');
  if (!mist) return null;
  const drift = interpolateNumber(-28, 34, cinematicSlow(progress, 0.9));
  const breathe = Math.sin(frame / (fps * 2.7)) * 8;

  return (
    <>
      <div
        style={{
          ...styles.mistA,
          opacity: mist.intensity,
          transform: `translate3d(${drift}px, ${breathe}px, 0)`,
        }}
      />
      <div
        style={{
          ...styles.mistB,
          opacity: mist.intensity * 0.58,
          transform: `translate3d(${-drift * 0.72}px, ${-breathe * 0.5}px, 0)`,
        }}
      />
    </>
  );
}

function SuspendedDepth({
  shot,
  frame,
  progress,
  fps,
}: {
  shot: SceneV2Shot;
  frame: number;
  progress: number;
  fps: number;
}) {
  const depth = shot.atmosphere.find((item) => item.preset === 'numinousDrift');
  if (!depth) return null;

  return (
    <div style={styles.particleField}>
      {Array.from({ length: 14 }, (_unused, index) => {
        const x = 7 + ((index * 31) % 89);
        const y = 5 + ((index * 47) % 91);
        const radius = 2 + (index % 4) * 0.8;
        const phase = index * 0.61;
        const driftX =
          Math.sin(frame / (fps * (2.7 + (index % 3) * 0.53)) + phase) *
          (3 + (index % 4));
        const driftY =
          Math.cos(frame / (fps * (3.9 + (index % 5) * 0.41)) + phase) *
            (5 + (index % 3)) -
          progress * (4 + (index % 3));
        const opacity = depth.intensity * (0.18 + (index % 5) * 0.055);

        return (
          <span
            key={index}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: radius,
              height: radius,
              borderRadius: '50%',
              background: 'rgba(201,226,222,0.78)',
              boxShadow: '0 0 7px rgba(157,205,204,0.26)',
              opacity,
              transform: `translate3d(${driftX}px, ${driftY}px, 0)`,
            }}
          />
        );
      })}
    </div>
  );
}

function NuminousCoherence({
  shot,
  frame,
  progress,
  fps,
  baseAsset,
}: {
  shot: SceneV2Shot;
  frame: number;
  progress: number;
  fps: number;
  baseAsset: string;
}) {
  const performance = shot.performance.find(
    (item) => item.preset === 'numinousDrift' && item.enabled !== false,
  );
  if (!performance) return null;

  const activeProgress = clamp(
    (progress - performance.startProgress) /
      Math.max(0.001, performance.endProgress - performance.startProgress),
    0,
    1,
  );
  const recognitionRise = smoothstep(0, 0.62, activeProgress);
  const dissolution = 1 - smoothstep(0.82, 1, activeProgress);
  const coherence = recognitionRise * dissolution;
  const independentX =
    Math.sin(frame / (fps * 3.23) + 0.4) * 2.8 +
    Math.sin(frame / (fps * 5.17) + 1.1) * 1.4;
  const independentY =
    Math.cos(frame / (fps * 4.61) + 0.2) * 2.2 +
    Math.sin(frame / (fps * 7.07) + 0.9) * 1.1;
  const lightBias = 0.55 + Math.sin(frame / (fps * 2.41) + 0.7) * 0.08;
  const echoOpacity = coherence * performance.intensity * 0.48;

  return (
    <div style={styles.numinousField}>
      <Img
        src={baseAsset}
        style={{
          ...styles.numinousEcho,
          opacity: echoOpacity,
          filter: `blur(${5.5 - coherence * 1.8}px) brightness(${1.02 + coherence * 0.08}) saturate(${0.88 + coherence * 0.08}) contrast(${1.01 + coherence * 0.035})`,
          transform: `translate3d(${independentX}px, ${independentY}px, 0) scale(${1.002 + coherence * 0.004})`,
        }}
      />
      <div
        style={{
          ...styles.coherenceCurrentA,
          opacity: coherence * performance.intensity * lightBias,
          transform: `translate3d(${independentX * -1.8}px, ${independentY * 0.7}px, 0) rotate(${Math.sin(frame / (fps * 6.3)) * 0.35}deg)`,
        }}
      />
      <div
        style={{
          ...styles.coherenceCurrentB,
          opacity: coherence * performance.intensity * 0.42,
          transform: `translate3d(${independentX * 1.2}px, ${independentY * -0.8}px, 0)`,
        }}
      />
      <div
        style={{
          ...styles.handoffWaterShape,
          opacity: smoothstep(0.84, 1, activeProgress) * 0.13,
          transform: `translate3d(${Math.sin(frame / (fps * 3.6)) * 3}px, ${Math.cos(frame / (fps * 4.8)) * 2}px, 0)`,
        }}
      />
    </div>
  );
}

function ReflectedLight({
  shot,
  frame,
  progress,
  fps,
}: {
  shot: SceneV2Shot;
  frame: number;
  progress: number;
  fps: number;
}) {
  if (hasNuminousCoherence(shot)) return null;
  const light = shot.lighting.find((item) => item.preset === 'waterPulse');
  if (!light) return null;
  const pulse = 0.5 + 0.5 * Math.sin(frame / (fps * 0.72));
  const handoff = progress > 0.68 ? (progress - 0.68) / 0.32 : 0;
  const opacity = light.intensityFrom * 0.22 + pulse * 0.018 + handoff * 0.018;

  return <div style={{ ...styles.faceReflection, opacity }} />;
}

function CinematicGrade({
  shot,
  progress,
}: {
  shot: SceneV2Shot;
  progress: number;
}) {
  if (hasNuminousCoherence(shot)) {
    const depth = 0.07 + progress * 0.025;
    return (
      <>
        <AbsoluteFill style={styles.vignette} />
        <AbsoluteFill
          style={{
            background: `linear-gradient(180deg, rgba(22,68,78,${depth}) 0%, rgba(5,35,47,0.04) 45%, rgba(99,158,157,0.045) 100%)`,
            mixBlendMode: 'soft-light',
            pointerEvents: 'none',
          }}
        />
      </>
    );
  }

  const warm = 0.05 + progress * 0.025;
  return (
    <>
      <AbsoluteFill style={styles.vignette} />
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(19,43,48,0.05) 0%, rgba(182,128,65,${warm}) 100%)`,
          mixBlendMode: 'soft-light',
          pointerEvents: 'none',
        }}
      />
    </>
  );
}

function ReviewGuide({
  scene,
  progress,
}: {
  scene: SceneV2;
  progress: number;
}) {
  const nearest = scene.reviewMarkers.reduce((best, marker) =>
    Math.abs(marker.progress - progress) < Math.abs(best.progress - progress)
      ? marker
      : best,
  );

  return (
    <div style={styles.reviewGuide}>
      <strong>{nearest.id}</strong>
      <span>{Math.round(progress * 100)}%</span>
    </div>
  );
}

function hasNuminousCoherence(shot: SceneV2Shot): boolean {
  return shot.performance.some(
    (item) => item.preset === 'numinousDrift' && item.enabled !== false,
  );
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function shotForFrame(scene: SceneV2, frame: number): SceneV2Shot | undefined {
  return scene.shots.find(
    (shot) => frame >= shot.startFrame && frame < shot.startFrame + shot.durationFrames,
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    backgroundColor: '#071417',
    overflow: 'hidden',
  },
  camera: {
    position: 'absolute',
    inset: '-3%',
    transformOrigin: '50% 48%',
    willChange: 'transform',
  },
  artwork: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  waterWindow: {
    position: 'absolute',
    left: '-6%',
    right: '-6%',
    bottom: '-2%',
    height: '43%',
    overflow: 'hidden',
    mixBlendMode: 'screen',
    pointerEvents: 'none',
    maskImage: 'linear-gradient(to bottom, transparent 0%, black 32%, black 100%)',
    WebkitMaskImage:
      'linear-gradient(to bottom, transparent 0%, black 32%, black 100%)',
  },
  deepWaterWindow: {
    position: 'absolute',
    inset: '-5%',
    overflow: 'hidden',
    mixBlendMode: 'screen',
    pointerEvents: 'none',
    maskImage:
      'linear-gradient(to bottom, rgba(0,0,0,0.68) 0%, black 22%, black 88%, rgba(0,0,0,0.76) 100%)',
    WebkitMaskImage:
      'linear-gradient(to bottom, rgba(0,0,0,0.68) 0%, black 22%, black 88%, rgba(0,0,0,0.76) 100%)',
  },
  waterBandA: {
    position: 'absolute',
    inset: '0 -10%',
    background:
      'repeating-linear-gradient(176deg, transparent 0 22px, rgba(205,185,131,0.22) 24px 27px, transparent 30px 58px)',
    filter: 'blur(5px)',
  },
  waterBandB: {
    position: 'absolute',
    inset: '8% -12% -4%',
    background:
      'repeating-linear-gradient(183deg, transparent 0 31px, rgba(125,178,181,0.17) 34px 38px, transparent 41px 71px)',
    filter: 'blur(8px)',
  },
  deepWaterBand: {
    position: 'absolute',
    inset: '-4% -8%',
    background:
      'repeating-linear-gradient(169deg, transparent 0 45px, rgba(147,207,203,0.11) 49px 54px, transparent 58px 106px)',
    filter: 'blur(11px)',
  },
  mistA: {
    position: 'absolute',
    width: '82%',
    height: '28%',
    left: '-12%',
    top: '9%',
    borderRadius: '50%',
    background:
      'radial-gradient(ellipse at center, rgba(225,219,197,0.34) 0%, rgba(195,207,198,0.14) 42%, transparent 72%)',
    filter: 'blur(42px)',
    mixBlendMode: 'screen',
    pointerEvents: 'none',
  },
  mistB: {
    position: 'absolute',
    width: '76%',
    height: '24%',
    right: '-20%',
    top: '24%',
    borderRadius: '50%',
    background:
      'radial-gradient(ellipse at center, rgba(204,214,207,0.26) 0%, rgba(178,197,191,0.1) 48%, transparent 74%)',
    filter: 'blur(52px)',
    mixBlendMode: 'screen',
    pointerEvents: 'none',
  },
  particleField: {
    position: 'absolute',
    inset: '3%',
    overflow: 'hidden',
    mixBlendMode: 'screen',
    pointerEvents: 'none',
  },
  numinousField: {
    position: 'absolute',
    inset: '0',
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  numinousEcho: {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transformOrigin: '52% 46%',
    mixBlendMode: 'soft-light',
    maskImage:
      'radial-gradient(ellipse 39% 43% at 53% 45%, black 0%, rgba(0,0,0,0.82) 40%, rgba(0,0,0,0.28) 65%, transparent 84%)',
    WebkitMaskImage:
      'radial-gradient(ellipse 39% 43% at 53% 45%, black 0%, rgba(0,0,0,0.82) 40%, rgba(0,0,0,0.28) 65%, transparent 84%)',
  },
  coherenceCurrentA: {
    position: 'absolute',
    width: '58%',
    height: '46%',
    left: '23%',
    top: '22%',
    borderRadius: '47% 53% 52% 48%',
    background:
      'repeating-linear-gradient(171deg, transparent 0 27px, rgba(171,222,217,0.2) 31px 34px, transparent 39px 68px)',
    filter: 'blur(13px)',
    mixBlendMode: 'screen',
    maskImage:
      'radial-gradient(ellipse at 51% 48%, black 0%, rgba(0,0,0,0.78) 46%, transparent 78%)',
    WebkitMaskImage:
      'radial-gradient(ellipse at 51% 48%, black 0%, rgba(0,0,0,0.78) 46%, transparent 78%)',
  },
  coherenceCurrentB: {
    position: 'absolute',
    width: '42%',
    height: '54%',
    left: '31%',
    top: '19%',
    borderRadius: '50%',
    background:
      'linear-gradient(104deg, transparent 10%, rgba(127,194,194,0.13) 38%, transparent 53%, rgba(204,228,214,0.1) 72%, transparent 91%)',
    filter: 'blur(20px)',
    mixBlendMode: 'screen',
  },
  handoffWaterShape: {
    position: 'absolute',
    width: '36%',
    height: '16%',
    left: '34%',
    bottom: '12%',
    borderRadius: '50%',
    background:
      'radial-gradient(ellipse at center, rgba(201,229,215,0.62) 0%, rgba(126,184,181,0.18) 44%, transparent 76%)',
    filter: 'blur(18px)',
    mixBlendMode: 'screen',
  },
  faceReflection: {
    position: 'absolute',
    width: '38%',
    height: '31%',
    left: '34%',
    top: '21%',
    borderRadius: '48%',
    background:
      'radial-gradient(ellipse at 55% 58%, rgba(224,194,129,0.58) 0%, rgba(192,167,119,0.14) 34%, transparent 68%)',
    filter: 'blur(18px)',
    mixBlendMode: 'soft-light',
    pointerEvents: 'none',
  },
  vignette: {
    boxShadow: 'inset 0 0 210px 46px rgba(2,9,11,0.38)',
    pointerEvents: 'none',
  },
  reviewGuide: {
    position: 'absolute',
    top: 52,
    right: 52,
    display: 'flex',
    gap: 18,
    alignItems: 'center',
    padding: '12px 18px',
    borderRadius: 999,
    background: 'rgba(5,15,18,0.72)',
    color: '#f1e6cd',
    fontFamily: 'Arial, sans-serif',
    fontSize: 22,
    letterSpacing: 0.5,
  },
};
