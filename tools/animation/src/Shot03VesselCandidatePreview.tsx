import React from 'react';
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export interface Shot03VesselCandidatePreviewProps {
  sourceAsset?: string;
  vesselAsset?: string;
  motionStrength?: number;
  showReviewGuides?: boolean;
}

export function Shot03VesselCandidatePreview({
  sourceAsset,
  vesselAsset,
  motionStrength = 1,
  showReviewGuides = false,
}: Shot03VesselCandidatePreviewProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  if (!sourceAsset || !vesselAsset) {
    return <AbsoluteFill style={styles.empty} />;
  }

  const seconds = frame / fps;
  const progress = frame / Math.max(1, durationInFrames - 1);
  const inertia = Math.sin(seconds * 0.86) * 0.62 + Math.sin(seconds * 0.31 + 0.8) * 0.38;
  const settle = Math.cos(seconds * 0.47 + 0.2);
  const x = inertia * 5.8 * motionStrength;
  const y = settle * 2.6 * motionStrength;
  const rotation = (Math.sin(seconds * 0.54 + 0.45) * 0.42 + Math.sin(seconds * 0.19) * 0.14) * motionStrength;
  const scale = 1 + Math.sin(seconds * 0.28 + 0.6) * 0.0018 * motionStrength;

  return (
    <AbsoluteFill style={styles.root}>
      <Img src={staticFile(sourceAsset)} style={styles.artwork} />

      <Img
        src={staticFile(vesselAsset)}
        style={{
          ...styles.vessel,
          opacity: 0.995,
          transform: `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg) scale(${scale})`,
        }}
      />

      <Img
        src={staticFile(vesselAsset)}
        style={{
          ...styles.vessel,
          opacity: 0.09,
          mixBlendMode: 'screen',
          filter: 'blur(0.45px) brightness(1.05)',
          transform: `translate3d(${-x * 0.35}px, ${y * 0.2}px, 0) rotate(${-rotation * 0.4}deg)`,
        }}
      />

      <AbsoluteFill style={styles.vignette} />

      {showReviewGuides ? (
        <div style={styles.reviewGuide}>
          <strong>shot03-vessel-v1 diagnostic motion</strong>
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
  vessel: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    transformOrigin: '50% 63%',
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
