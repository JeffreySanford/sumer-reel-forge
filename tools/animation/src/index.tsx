import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { CinematicMotionProof } from './CinematicMotionProof';
import { CinematicStyleTest } from './CinematicStyleTest';
import { FullReelAnimation } from './FullReelAnimation';
import { ReelAnimation } from './ReelAnimation';
import {
  SceneV2Benchmark,
  type SceneV2BenchmarkProps,
} from './SceneV2Benchmark';
import { proofScene } from './scene-data';

const emptySceneV2Props: SceneV2BenchmarkProps = {};

function RemotionRoot() {
  return (
    <>
      <Composition
        id="ReelAnimation"
        component={ReelAnimation}
        durationInFrames={proofScene.durationFrames}
        fps={proofScene.fps}
        width={proofScene.width}
        height={proofScene.height}
      />
      <Composition
        id="CinematicStyleTest"
        component={CinematicStyleTest}
        durationInFrames={360}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="CinematicMotionProof"
        component={CinematicMotionProof}
        durationInFrames={540}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="FullReelAnimation"
        component={FullReelAnimation}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="SceneV2Benchmark"
        component={SceneV2Benchmark}
        durationInFrames={210}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={emptySceneV2Props}
        calculateMetadata={({ props }) => ({
          durationInFrames: props.scene?.durationFrames ?? 210,
          fps: props.scene?.fps ?? 30,
          width: props.scene?.width ?? 1080,
          height: props.scene?.height ?? 1920,
        })}
      />
    </>
  );
}

registerRoot(RemotionRoot);
