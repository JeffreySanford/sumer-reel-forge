import React from 'react';
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export interface Shot03EnkiBodyCandidatePreviewProps {
  sourceAsset?: string;
  enkiAsset?: string;
  motionStrength?: number;
  showReviewGuides?: boolean;
}

export function Shot03EnkiBodyCandidatePreview({
  sourceAsset,
  enkiAsset,
  motionStrength = 1,
  showReviewGuides = false,
}: Shot03EnkiBodyCandidatePreviewProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  if (!sourceAsset || !enkiAsset) {
    return <AbsoluteFill style={styles.empty} />;
  }

  const seconds = frame / fps;
  const progress = frame / Math.max(1, durationInFrames - 1);
  const breath = Math.sin(seconds * 0.82 + 0.35);
  const settle = Math.sin(seconds * 0.31 + 1.05);
  const x = settle * 2.8 * motionStrength;
  const y = breath * 1.65 * motionStrength;
  const scaleX = 1 + breath * 0.00115 * motionStrength;
  const scaleY = 1 + breath * 0.00215 * motionStrength;
  const rotation = Math.sin(seconds * 0.37 + 0.5) * 0.085 * motionStrength;

  return (
    <AbsoluteFill style={styles.root}>
      <Img src={staticFile(sourceAsset)} style={styles.artwork} />

      <Img
        src={staticFile(enkiAsset)}
        style={{
          ...styles.enki,
          opacity: 0.998,
          transform: `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg) scaleX(${scaleX}) scaleY(${scaleY})`,
        }}
      />

      <Img
        src={staticFile(enkiAsset)}
        style={{
          ...styles.enki,
          opacity: 0.055,
          mixBlendMode: 'screen',
          filter: 'blur(0.35px) brightness(1.035)',
          transform: `translate3d(${-x * 0.3}px, ${-y * 0.15}px, 0) scale(${1 + breath * 0.0006 * motionStrength})`,
        }}
      />

      <AbsoluteFill style={styles.vignette} />

      {showReviewGuides ? (
        <div style={styles.reviewGuide}>
          <strong>shot03-enki-body-v1 identity-preservation diagnostic</strong>
          <span>
            {Math.round(progress * 100)}% · strength {motionStrength.toFixed(1)}
          </span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    backgroundColor: '#071417',
    overflow: 'hidden',
  },
  empty: {
    backgroundColor: '#071417',
  },
  artwork: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  enki: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    transformOrigin: '50% 45%',
    willChange: 'transform, opacity',
  },
  vignette: {
    pointerEvents: 'none',
    boxShadow: 'inset 0 0 180px rgba(3, 11, 14, 0.18)',
  },
  reviewGuide: {
    position: 'absolute',
    left: 36,
    right: 36,
    bottom: 42,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: 12,
    background: 'rgba(4, 15, 19, 0.72)',
    color: 'rgba(238, 244, 241, 0.92)',
    fontFamily: 'sans-serif',
    fontSize: 22,
    letterSpacing: 0.2,
  },
};
