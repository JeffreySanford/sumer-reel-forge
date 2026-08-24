import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { REEL_ONE } from '../../../libs/reel-core/src/lib/reel-core';
import type { SceneV2BenchmarkProps } from './SceneV2Benchmark';
import { SceneV2ResolvedBenchmark } from './SceneV2ResolvedBenchmark';

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

export function CanonicalReel1(props: SceneV2BenchmarkProps) {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={styles.root}>
      <SceneV2ResolvedBenchmark {...props} showReviewGuides={false} />
      <Caption frame={frame} />
      <EndTitle frame={frame} />
    </AbsoluteFill>
  );
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
