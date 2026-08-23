import React from 'react';
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export interface Shot03WaterCandidatePreviewProps {
  sourceAsset?: string;
  waterAsset?: string;
  motionStrength?: number;
  showReviewGuides?: boolean;
}

export function Shot03WaterCandidatePreview({
  sourceAsset,
  waterAsset,
  motionStrength = 1,
  showReviewGuides = false,
}: Shot03WaterCandidatePreviewProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  if (!sourceAsset || !waterAsset) {
    return <AbsoluteFill style={styles.empty} />;
  }

  const seconds = frame / fps;
  const progress = frame / Math.max(1, durationInFrames - 1);
  const driftX =
    (Math.sin(seconds * 0.72) * 1.55 +
      Math.sin(seconds * 0.27 + 0.8) * 0.65) *
    motionStrength;
  const driftY =
    (Math.cos(seconds * 0.48 + 0.3) * 0.72 +
      Math.sin(seconds * 0.21) * 0.34) *
    motionStrength;
  const scale =
    1 + Math.sin(seconds * 0.36 + 0.4) * 0.0015 * motionStrength;
  const brightness =
    1 + Math.sin(seconds * 0.57 + 0.9) * 0.012 * motionStrength;
  const echoX = -driftX * 0.55;
  const echoY = driftY * 0.35;

  return (
    <AbsoluteFill style={styles.root}>
      <Img src={staticFile(sourceAsset)} style={styles.artwork} />

      <Img
        src={staticFile(waterAsset)}
        style={{
          ...styles.water,
          opacity: 0.92,
          filter: `brightness(${brightness}) saturate(1.01)`,
          transform: `translate3d(${driftX}px, ${driftY}px, 0) scale(${scale})`,
        }}
      />

      <Img
        src={staticFile(waterAsset)}
        style={{
          ...styles.water,
          opacity: 0.07,
          mixBlendMode: 'screen',
          filter: 'blur(0.35px) brightness(1.06)',
          transform: `translate3d(${echoX}px, ${echoY}px, 0) scale(${1 + (scale - 1) * 0.5})`,
        }}
      />

      <AbsoluteFill style={styles.vignette} />

      {showReviewGuides ? (
        <div style={styles.reviewGuide}>
          <strong>shot03-water-v1 candidate</strong>
          <span>{Math.round(progress * 100)}%</span>
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
  water: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    transformOrigin: '50% 72%',
    willChange: 'transform, filter, opacity',
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
