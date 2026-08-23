import React from 'react';
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  SceneV2Benchmark,
  type SceneV2BenchmarkProps,
} from './SceneV2Benchmark';
import {
  assertSceneV2,
  cinematicSlow,
  clamp,
  interpolateNumber,
  type SceneV2,
  type SceneV2Layer,
  type SceneV2Shot,
} from './scene-v2';

export function SceneV2ResolvedBenchmark(props: SceneV2BenchmarkProps) {
  const layered = props.scene?.shots.some((shot) =>
    shot.layers.some((layer) => layer.material === 'editorial-reference'),
  );

  if (!layered) {
    return <SceneV2Benchmark {...props} />;
  }

  return <LayeredSceneV2Benchmark {...props} />;
}

function LayeredSceneV2Benchmark({
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

  return (
    <AbsoluteFill style={styles.root}>
      <div
        style={{
          ...styles.camera,
          transform: `translate3d(${x}px, ${y}px, 0) scale(${scale}) rotate(${rotation}deg)`,
        }}
      >
        <LayerStack shot={shot} frame={frame} progress={progress} fps={fps} />
        <ProceduralWaterLight shot={shot} frame={frame} progress={progress} fps={fps} />
        <ProceduralAtmosphere shot={shot} frame={frame} progress={progress} fps={fps} />
        <NuminousReference shot={shot} frame={frame} progress={progress} fps={fps} />
      </div>
      <LayeredGrade shot={shot} progress={progress} />
      {showReviewGuides ? <ReviewGuide scene={scene} progress={progress} /> : null}
    </AbsoluteFill>
  );
}

function LayerStack({
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
  const layers = [...shot.layers]
    .filter(
      (layer) =>
        layer.material !== 'editorial-reference' && layer.role !== 'mask',
    )
    .sort((a, b) => a.depth - b.depth);

  return (
    <>
      {layers.map((layer) => (
        <AnimatedLayer
          key={layer.id}
          layer={layer}
          shot={shot}
          frame={frame}
          progress={progress}
          fps={fps}
        />
      ))}
    </>
  );
}

function AnimatedLayer({
  layer,
  shot,
  frame,
  progress,
  fps,
}: {
  layer: SceneV2Layer;
  shot: SceneV2Shot;
  frame: number;
  progress: number;
  fps: number;
}) {
  if (layer.motionPresets.includes('smokeDrift')) {
    return (
      <SmokeMaterialLayer
        layer={layer}
        shot={shot}
        frame={frame}
        progress={progress}
        fps={fps}
      />
    );
  }

  const phase = frame / fps;
  const settleWeight = progress > 0.8 ? 1 - (progress - 0.8) / 0.2 : 1;
  let x = layer.transform.x;
  let y = layer.transform.y;
  let scale = layer.transform.scale;
  let rotation = 0;

  if (layer.motionPresets.includes('waterPulse')) {
    x += Math.sin(phase * 0.72 + layer.depth * 3.1) * (1.8 + layer.depth * 3.2);
    y += Math.cos(phase * 0.47 + layer.depth * 2.4) * (0.8 + layer.depth * 1.5);
    scale *= 1 + Math.sin(phase * 0.36 + layer.depth) * 0.0018;
  }
  if (layer.motionPresets.includes('heavyPhysical')) {
    y += Math.sin(phase * 0.54 * Math.PI * 2) * 1.7 * settleWeight;
    rotation += Math.sin((phase * 0.54 + 0.18) * Math.PI * 2) * 0.045 * settleWeight;
  }
  if (layer.motionPresets.includes('riggingTension')) {
    x += Math.sin(phase * 0.61 + 0.9) * 1.25;
    rotation += Math.sin(phase * 0.43 + 0.4) * 0.085;
  }
  if (layer.motionPresets.includes('clothLag')) {
    x += Math.sin(phase * 0.39 + 0.6) * 0.8;
    y += Math.sin(phase * 0.31 + 1.2) * 0.55;
  }
  if (
    layer.motionPresets.includes('breathing') &&
    shot.performance.some(
      (item) => item.preset === 'breathing' && item.enabled !== false,
    )
  ) {
    scale *= 1 + Math.sin(phase * 0.23 * Math.PI * 2) * 0.0018;
  }
  if (layer.motionPresets.includes('numinousDrift')) {
    x += Math.sin(phase * 0.31 + layer.depth * 4.2) * 1.8;
    y += Math.cos(phase * 0.27 + layer.depth * 2.7) * 1.35;
  }

  const opacity = layerOpacity(layer, shot, progress);
  const blendMode =
    layer.role === 'light'
      ? 'screen'
      : layer.role === 'reflection'
        ? 'soft-light'
        : 'normal';

  return (
    <Img
      src={staticFile(layer.assetPath)}
      style={{
        ...styles.layer,
        opacity,
        mixBlendMode: blendMode,
        transformOrigin: transformOriginForAnchor(layer.anchor),
        transform: `translate3d(${x}px, ${y}px, 0) scale(${scale}) rotate(${rotation}deg)`,
      }}
    />
  );
}

function SmokeMaterialLayer({
  layer,
  shot,
  frame,
  progress,
  fps,
}: {
  layer: SceneV2Layer;
  shot: SceneV2Shot;
  frame: number;
  progress: number;
  fps: number;
}) {
  const phase = frame / fps;
  const atmosphere = shot.atmosphere.find((item) => item.preset === 'smokeDrift');
  const intensity = clamp(atmosphere?.intensity ?? 0.12, 0.04, 0.25);
  const source = staticFile(layer.assetPath);
  const baseX = layer.transform.x;
  const baseY = layer.transform.y;
  const baseScale = layer.transform.scale;
  const origin = transformOriginForAnchor(layer.anchor);

  const channels = [
    {
      opacity: 0.58 + intensity * 0.32,
      x: Math.sin(phase * 0.31 + 0.2) * 0.7,
      y: -progress * 1.4 + Math.cos(phase * 0.23 + 0.7) * 0.45,
      scale: 1 + Math.sin(phase * 0.17 + 0.3) * 0.0014,
      blur: 0.35,
    },
    {
      opacity: 0.24,
      x: Math.sin(phase * 0.19 + 1.4) * 1.55,
      y: -progress * 2.8 + Math.cos(phase * 0.27 + 1.1) * 0.75,
      scale: 1.002 + Math.sin(phase * 0.13 + 0.8) * 0.0018,
      blur: 1.4,
    },
    {
      opacity: 0.12,
      x: Math.sin(phase * 0.14 + 2.1) * 2.2,
      y: -progress * 4.1 + Math.cos(phase * 0.18 + 2.4) * 1.0,
      scale: 1.004 + Math.sin(phase * 0.11 + 1.5) * 0.0022,
      blur: 2.5,
    },
  ];

  return (
    <>
      {channels.map((channel, index) => (
        <Img
          key={`${layer.id}-smoke-${index}`}
          src={source}
          style={{
            ...styles.layer,
            opacity: channel.opacity,
            filter: `blur(${channel.blur}px)`,
            mixBlendMode: index === 0 ? 'normal' : 'screen',
            transformOrigin: origin,
            transform: `translate3d(${baseX + channel.x}px, ${baseY + channel.y}px, 0) scale(${baseScale * channel.scale})`,
          }}
        />
      ))}
    </>
  );
}

function layerOpacity(
  layer: SceneV2Layer,
  shot: SceneV2Shot,
  progress: number,
): number {
  if (
    layer.role === 'character-state' &&
    layer.motionPresets.includes('blinkOnce')
  ) {
    const blink = shot.performance.find(
      (item) => item.preset === 'blinkOnce' && item.enabled !== false,
    );
    if (!blink) return 0;
    const local = clamp(
      (progress - blink.startProgress) /
        Math.max(0.001, blink.endProgress - blink.startProgress),
      0,
      1,
    );
    return Math.pow(Math.sin(local * Math.PI), 2) * blink.intensity;
  }

  if (layer.role === 'light') {
    return numinousEnvelope(shot, progress) * 0.5;
  }

  return 1;
}

function NuminousReference({
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
  const performance = shot.performance.find(
    (item) => item.preset === 'numinousDrift' && item.enabled !== false,
  );
  const reference = shot.layers.find(
    (layer) => layer.material === 'editorial-reference',
  );
  const mask = shot.layers.find(
    (layer) => layer.role === 'mask' && layer.motionPresets.includes('numinousDrift'),
  );
  if (!performance || !reference || !mask) return null;

  const coherence = numinousEnvelope(shot, progress);
  if (coherence <= 0) return null;
  const phase = frame / fps;
  const driftX = Math.sin(phase * 0.31 + 0.4) * 2.4;
  const driftY = Math.cos(phase * 0.23 + 0.8) * 1.9;
  const maskUrl = staticFile(mask.assetPath);

  return (
    <Img
      src={staticFile(reference.assetPath)}
      style={{
        ...styles.layer,
        opacity: coherence * performance.intensity * 0.54,
        filter: `blur(${5.2 - coherence * 1.7}px) brightness(${1.02 + coherence * 0.08}) saturate(${0.9 + coherence * 0.08})`,
        mixBlendMode: 'soft-light',
        maskImage: `url("${maskUrl}")`,
        WebkitMaskImage: `url("${maskUrl}")`,
        maskSize: 'cover',
        WebkitMaskSize: 'cover',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        transform: `translate3d(${driftX}px, ${driftY}px, 0) scale(${1.002 + coherence * 0.003})`,
      }}
    />
  );
}

function ProceduralWaterLight({
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
    cinematicSlow(progress, 0.9),
  );
  const phase = frame / fps;
  const drift = Math.sin(phase * 0.69) * 13 + Math.sin(phase * 0.27) * 5;

  return (
    <div style={styles.waterLightWindow}>
      <div
        style={{
          ...styles.waterLightA,
          opacity: intensity * 0.82,
          transform: `translate3d(${drift}px, 0, 0)`,
        }}
      />
      <div
        style={{
          ...styles.waterLightB,
          opacity: intensity * 0.48,
          transform: `translate3d(${-drift * 0.67}px, 0, 0)`,
        }}
      />
    </div>
  );
}

function ProceduralAtmosphere({
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
  const depth = shot.atmosphere.find((item) => item.preset === 'numinousDrift');
  const phase = frame / fps;

  return (
    <>
      {mist ? (
        <div
          style={{
            ...styles.mist,
            opacity: mist.intensity,
            transform: `translate3d(${interpolateNumber(-20, 26, cinematicSlow(progress, 0.9))}px, ${Math.sin(phase * 0.35) * 6}px, 0)`,
          }}
        />
      ) : null}
      {depth ? (
        <div style={styles.particleField}>
          {Array.from({ length: 12 }, (_unused, index) => {
            const x = 8 + ((index * 29) % 86);
            const y = 6 + ((index * 43) % 88);
            const driftX = Math.sin(phase / (2.2 + (index % 3) * 0.4) + index) * 4;
            const driftY = Math.cos(phase / (3.1 + (index % 4) * 0.45) + index) * 5 - progress * 3;
            return (
              <span
                key={index}
                style={{
                  position: 'absolute',
                  left: `${x}%`,
                  top: `${y}%`,
                  width: 2 + (index % 3),
                  height: 2 + (index % 3),
                  borderRadius: '50%',
                  background: 'rgba(199,226,220,0.72)',
                  opacity: depth.intensity * (0.25 + (index % 4) * 0.08),
                  transform: `translate3d(${driftX}px, ${driftY}px, 0)`,
                }}
              />
            );
          })}
        </div>
      ) : null}
    </>
  );
}

function LayeredGrade({
  shot,
  progress,
}: {
  shot: SceneV2Shot;
  progress: number;
}) {
  const numinous = shot.performance.some(
    (item) => item.preset === 'numinousDrift' && item.enabled !== false,
  );
  const tint = numinous
    ? `linear-gradient(180deg, rgba(18,65,76,${0.055 + progress * 0.025}) 0%, rgba(8,39,50,0.035) 52%, rgba(103,159,157,0.035) 100%)`
    : `linear-gradient(180deg, rgba(18,40,45,0.035) 0%, rgba(180,127,66,${0.04 + progress * 0.02}) 100%)`;

  return (
    <>
      <AbsoluteFill style={styles.vignette} />
      <AbsoluteFill
        style={{
          background: tint,
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

function numinousEnvelope(shot: SceneV2Shot, progress: number): number {
  const performance = shot.performance.find(
    (item) => item.preset === 'numinousDrift' && item.enabled !== false,
  );
  if (!performance) return 0;
  const active = clamp(
    (progress - performance.startProgress) /
      Math.max(0.001, performance.endProgress - performance.startProgress),
    0,
    1,
  );
  const rise = smoothstep(0, 0.62, active);
  const dissolve = 1 - smoothstep(0.82, 1, active);
  return rise * dissolve;
}

function transformOriginForAnchor(anchor: string): string {
  if (anchor.includes('torso')) return '50% 46%';
  if (anchor.includes('eyes')) return '50% 34%';
  if (anchor.includes('rigging-root')) return '50% 18%';
  if (anchor.includes('vessel')) return '50% 62%';
  if (anchor.includes('smoke')) return '50% 68%';
  if (anchor.includes('textile')) return '50% 24%';
  if (anchor.includes('lower')) return '50% 72%';
  if (anchor.includes('upper')) return '50% 28%';
  return '50% 50%';
}

function shotForFrame(scene: SceneV2, frame: number): SceneV2Shot | undefined {
  return scene.shots.find(
    (shot) => frame >= shot.startFrame && frame < shot.startFrame + shot.durationFrames,
  );
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
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
  layer: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    willChange: 'transform, opacity, filter',
  },
  waterLightWindow: {
    position: 'absolute',
    inset: '-4%',
    overflow: 'hidden',
    pointerEvents: 'none',
    mixBlendMode: 'screen',
  },
  waterLightA: {
    position: 'absolute',
    inset: '12% -10% -5%',
    background:
      'repeating-linear-gradient(176deg, transparent 0 27px, rgba(205,190,145,0.18) 31px 35px, transparent 39px 68px)',
    filter: 'blur(7px)',
  },
  waterLightB: {
    position: 'absolute',
    inset: '4% -12%',
    background:
      'repeating-linear-gradient(183deg, transparent 0 38px, rgba(132,190,191,0.13) 42px 47px, transparent 52px 91px)',
    filter: 'blur(11px)',
  },
  mist: {
    position: 'absolute',
    width: '82%',
    height: '30%',
    left: '-12%',
    top: '8%',
    borderRadius: '50%',
    background:
      'radial-gradient(ellipse at center, rgba(225,219,197,0.30) 0%, rgba(195,207,198,0.12) 43%, transparent 73%)',
    filter: 'blur(46px)',
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