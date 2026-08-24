import React from 'react';
import { AbsoluteFill, staticFile, useCurrentFrame } from 'remotion';
import {
  assertSceneV2,
  cinematicSlow,
  clamp,
  interpolateNumber,
  type SceneV2,
  type SceneV2Shot,
} from './scene-v2';

export interface SceneV2ContainedMaterialMaskProps {
  scene?: SceneV2;
  layerId?: string;
}

export function SceneV2ContainedMaterialMask({
  scene,
  layerId,
}: SceneV2ContainedMaterialMaskProps) {
  const frame = useCurrentFrame();

  if (!scene?.shots?.length || !layerId) {
    return <AbsoluteFill style={styles.black} />;
  }

  assertSceneV2(scene);
  const shot = shotForFrame(scene, frame) ?? scene.shots[0];
  const layer = shot.layers.find((candidate) => candidate.id === layerId);
  if (
    !layer ||
    layer.role !== 'water' ||
    layer.material !== 'water' ||
    !layer.anchor.includes('water-basin')
  ) {
    return <AbsoluteFill style={styles.black} />;
  }

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
  const source = staticFile(layer.assetPath);

  return (
    <AbsoluteFill style={styles.black}>
      <div
        style={{
          ...styles.camera,
          transform: `translate3d(${x}px, ${y}px, 0) scale(${scale}) rotate(${rotation}deg)`,
        }}
      >
        <div
          data-containment-mask={layer.id}
          style={{
            ...styles.mask,
            maskImage: `url("${source}")`,
            WebkitMaskImage: `url("${source}")`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}

function shotForFrame(scene: SceneV2, frame: number): SceneV2Shot | undefined {
  return scene.shots.find(
    (shot) => frame >= shot.startFrame && frame < shot.startFrame + shot.durationFrames,
  );
}

const styles: Record<string, React.CSSProperties> = {
  black: {
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  camera: {
    position: 'absolute',
    inset: '-3%',
    transformOrigin: '50% 48%',
  },
  mask: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    maskSize: 'cover',
    WebkitMaskSize: 'cover',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
  },
};
