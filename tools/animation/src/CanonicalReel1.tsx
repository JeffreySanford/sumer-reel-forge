import React from 'react';
import {
  AbsoluteFill,
  Freeze,
  Sequence,
  interpolate,
  useCurrentFrame,
} from 'remotion';
import { REEL_ONE } from '../../../libs/reel-core/src/lib/reel-core';
import { SceneV2ResolvedBenchmark } from './SceneV2ResolvedBenchmark';
import type { SceneV2 } from './scene-v2';

export interface CanonicalReel1Props {
  scenes?: SceneV2[];
}

const captions = REEL_ONE.onScreenText.map((caption, index) => ({
  ...caption,
  startFrame: parseTime(caption.time) * 30,
  endFrame:
    (REEL_ONE.onScreenText[index + 1]
      ? parseTime(REEL_ONE.onScreenText[index + 1].time)
      : REEL_ONE.targetDurationSeconds) *
      30 -
    1,
}));

export function CanonicalReel1({ scenes = [] }: CanonicalReel1Props) {
  const frame = useCurrentFrame();
  const timeline = buildTimeline(scenes);

  return (
    <AbsoluteFill style={styles.root}>
      {timeline.map(({ scene, startFrame, approvedDurationFrames, holdFrames }) => (
        <React.Fragment key={scene.sceneId}>
          <Sequence from={startFrame} durationInFrames={approvedDurationFrames}>
            <SceneV2ResolvedBenchmark scene={scene} showReviewGuides={false} />
          </Sequence>
          {holdFrames > 0 ? (
            <Sequence
              from={startFrame + approvedDurationFrames}
              durationInFrames={holdFrames}
            >
              <Freeze frame={approvedDurationFrames - 1}>
                <SceneV2ResolvedBenchmark scene={scene} showReviewGuides={false} />
              </Freeze>
            </Sequence>
          ) : null}
        </React.Fragment>
      ))}
      <Caption frame={frame} />
      <EndTitle frame={frame} />
    </AbsoluteFill>
  );
}

function buildTimeline(scenes: SceneV2[]) {
  if (scenes.length !== 8) {
    throw new Error(`Canonical Reel 1 requires 8 resolved Scene V2 shots; received ${scenes.length}.`);
  }

  return scenes.map((scene, index) => {
    if (scene.shots.length !== 1) {
      throw new Error(`${scene.sceneId} must contain exactly one canonical shot.`);
    }
    const shot = scene.shots[0];
    if (shot.sourceStartFrame === undefined) {
      throw new Error(`${scene.sceneId} is missing sourceStartFrame provenance.`);
    }
    const nextStartFrame =
      index + 1 < scenes.length
        ? scenes[index + 1].shots[0]?.sourceStartFrame
        : REEL_ONE.targetDurationSeconds * scene.fps;
    if (nextStartFrame === undefined) {
      throw new Error(`${scenes[index + 1]?.sceneId ?? 'next scene'} is missing sourceStartFrame provenance.`);
    }
    const slotDurationFrames = nextStartFrame - shot.sourceStartFrame;
    const holdFrames = slotDurationFrames - shot.durationFrames;
    if (slotDurationFrames <= 0 || holdFrames < 0) {
      throw new Error(
        `${scene.sceneId} approved duration ${shot.durationFrames} does not fit source timeline slot ${slotDurationFrames}.`,
      );
    }
    if (holdFrames > 0 && !(shot.sourceShotNumber === 5 && holdFrames === 30)) {
      throw new Error(
        `${scene.sceneId} introduces an unapproved ${holdFrames}-frame timeline hold. Only the explicit 30-frame Shot 5→6 handoff is allowed.`,
      );
    }

    return {
      scene,
      startFrame: shot.sourceStartFrame,
      approvedDurationFrames: shot.durationFrames,
      slotDurationFrames,
      holdFrames,
    };
  });
}

function Caption({ frame }: { frame: number }) {
  const caption = captions.find(
    (item) => frame >= item.startFrame && frame <= item.endFrame,
  );
  if (!caption) return null;

  return (
    <div style={styles.captionBand}>
      <div style={styles.caption}>{caption.text}</div>
    </div>
  );
}

function EndTitle({ frame }: { frame: number }) {
  const start = 1599;
  const hold = 1740;
  const end = 1799;
  if (frame < start) return null;

  const opacity = interpolate(frame, [start, start + 24, hold, end], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ ...styles.titleFade, opacity }}>
      <div style={styles.title}>THE VOYAGE BEGINS</div>
      <div style={styles.series}>BLESSINGS OF SUMER</div>
    </AbsoluteFill>
  );
}

function parseTime(value: string) {
  const [minutes, seconds] = value.split(':').map(Number);
  return minutes * 60 + seconds;
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: 1080,
    height: 1920,
    overflow: 'hidden',
    backgroundColor: '#081418',
    fontFamily: 'Arial, sans-serif',
  },
  captionBand: {
    position: 'absolute',
    left: 86,
    right: 86,
    bottom: 188,
    padding: '22px 30px',
    background: 'rgba(7, 17, 18, 0.82)',
    borderTop: '4px solid #c9a15a',
  },
  caption: {
    color: '#fff',
    fontSize: 44,
    lineHeight: 1.16,
    textAlign: 'center',
    textShadow: '0 2px 8px rgba(0,0,0,0.82)',
  },
  titleFade: {
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(8, 17, 19, 0.58)',
    color: '#fff',
    textAlign: 'center',
  },
  title: {
    maxWidth: 860,
    fontFamily: 'Georgia, serif',
    fontSize: 92,
    lineHeight: 1.02,
    letterSpacing: 1,
  },
  series: {
    marginTop: 24,
    color: '#d6ad58',
    fontSize: 34,
    fontWeight: 800,
    letterSpacing: 4,
  },
};
