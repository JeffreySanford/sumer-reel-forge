import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { CinematicMotionProof } from './CinematicMotionProof';
import { CinematicStyleTest } from './CinematicStyleTest';
import { FullReelAnimation } from './FullReelAnimation';
import { ReelAnimation } from './ReelAnimation';
import type { SceneV2BenchmarkProps } from './SceneV2Benchmark';
import { SceneV2ResolvedBenchmark } from './SceneV2ResolvedBenchmark';
import {
  Shot03EnkiBodyCandidatePreview,
  type Shot03EnkiBodyCandidatePreviewProps,
} from './Shot03EnkiBodyCandidatePreview';
import {
  Shot03LayeredCandidatePreview,
  type Shot03LayeredCandidatePreviewProps,
} from './Shot03LayeredCandidatePreview';
import {
  Shot03VesselCandidatePreview,
  type Shot03VesselCandidatePreviewProps,
} from './Shot03VesselCandidatePreview';
import {
  Shot03WaterCandidatePreview,
  type Shot03WaterCandidatePreviewProps,
} from './Shot03WaterCandidatePreview';
import {
  Shot04LayeredCandidatePreview,
  type Shot04LayeredCandidatePreviewProps,
} from './Shot04LayeredCandidatePreview';
import {
  SceneV2WaterHandoff,
  type SceneV2WaterHandoffProps,
} from './SceneV2WaterHandoff';
import { proofScene } from './scene-data';

const emptySceneV2Props: SceneV2BenchmarkProps = {};
const emptyWaterHandoffProps: SceneV2WaterHandoffProps = {};
const emptyShot03WaterCandidatePreviewProps: Shot03WaterCandidatePreviewProps = {};
const emptyShot03VesselCandidatePreviewProps: Shot03VesselCandidatePreviewProps = {};
const emptyShot03EnkiBodyCandidatePreviewProps: Shot03EnkiBodyCandidatePreviewProps = {};
const emptyShot03LayeredCandidatePreviewProps: Shot03LayeredCandidatePreviewProps = {};
const emptyShot04LayeredCandidatePreviewProps: Shot04LayeredCandidatePreviewProps = {};

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
        component={SceneV2ResolvedBenchmark}
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
      <Composition
        id="Shot03WaterCandidatePreview"
        component={Shot03WaterCandidatePreview}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={emptyShot03WaterCandidatePreviewProps}
      />
      <Composition
        id="Shot03VesselCandidatePreview"
        component={Shot03VesselCandidatePreview}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={emptyShot03VesselCandidatePreviewProps}
      />
      <Composition
        id="Shot03EnkiBodyCandidatePreview"
        component={Shot03EnkiBodyCandidatePreview}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={emptyShot03EnkiBodyCandidatePreviewProps}
      />
      <Composition
        id="Shot03LayeredCandidatePreview"
        component={Shot03LayeredCandidatePreview}
        durationInFrames={210}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={emptyShot03LayeredCandidatePreviewProps}
      />
      <Composition
        id="Shot04LayeredCandidatePreview"
        component={Shot04LayeredCandidatePreview}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={emptyShot04LayeredCandidatePreviewProps}
      />
      <Composition
        id="SceneV2WaterHandoff"
        component={SceneV2WaterHandoff}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={emptyWaterHandoffProps}
        calculateMetadata={({ props }) => ({
          durationInFrames:
            (props.outgoingScene?.durationFrames ?? 210) +
            (props.incomingScene?.durationFrames ?? 240),
          fps: props.outgoingScene?.fps ?? props.incomingScene?.fps ?? 30,
          width: props.outgoingScene?.width ?? props.incomingScene?.width ?? 1080,
          height: props.outgoingScene?.height ?? props.incomingScene?.height ?? 1920,
        })}
      />
    </>
  );
}

registerRoot(RemotionRoot);
