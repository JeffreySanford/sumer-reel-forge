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
        <ReflectedLight shot={shot} frame={frame} progress={progress} fps={fps} />
      </div>
      <CinematicGrade progress={progress} />
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

  const intensity = interpolateNumber(
    light.intensityFrom,
    light.intensityTo,
    cinematicSlow(progress, 0.86),
  );
  const slowDrift = Math.sin(frame / (fps * 1.35)) * 18;
  const shimmer = 0.84 + Math.sin(frame / (fps * 0.43)) * 0.16;

  return (
    <div style={styles.waterWindow}>
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
          opacity: intensity * 0.62,
          transform: `translate3d(${-slowDrift * 0.66}px, 0, 0)`,
        }}
      />
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
  const light = shot.lighting.find((item) => item.preset === 'waterPulse');
  if (!light) return null;
  const pulse = 0.5 + 0.5 * Math.sin(frame / (fps * 0.72));
  const handoff = progress > 0.68 ? (progress - 0.68) / 0.32 : 0;
  const opacity = light.intensityFrom * 0.22 + pulse * 0.018 + handoff * 0.018;

  return <div style={{ ...styles.faceReflection, opacity }} />;
}

function CinematicGrade({ progress }: { progress: number }) {
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
