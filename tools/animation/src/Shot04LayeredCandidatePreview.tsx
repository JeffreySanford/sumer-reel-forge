import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export interface Shot04LayeredCandidatePreviewProps {
  deepWaterAsset?: string;
  midCurrentAsset?: string;
  surfaceRefractionAsset?: string;
  nammuCoherenceAsset?: string;
  motionStrength?: number;
  showReviewGuides?: boolean;
}

export function Shot04LayeredCandidatePreview({
  deepWaterAsset,
  midCurrentAsset,
  surfaceRefractionAsset,
  nammuCoherenceAsset,
  motionStrength = 1,
  showReviewGuides = false,
}: Shot04LayeredCandidatePreviewProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  if (
    !deepWaterAsset ||
    !midCurrentAsset ||
    !surfaceRefractionAsset ||
    !nammuCoherenceAsset
  ) {
    return <AbsoluteFill style={styles.empty} />;
  }

  const seconds = frame / fps;
  const progress = frame / Math.max(1, durationInFrames - 1);
  const cameraScale = interpolate(progress, [0, 1], [1, 1.008]);
  const cameraX = interpolate(progress, [0, 1], [0, -2]);
  const cameraY = interpolate(progress, [0, 1], [0, 3]);

  // Water motion is layered as several very small phase-offset responses. The
  // source-derived alpha remains authoritative; this is not a translated-card
  // effect and the editorial base remains the stillness anchor.
  const currentX1 = Math.sin(seconds * 0.55 + 0.2) * 2.2 * motionStrength;
  const currentY1 = Math.cos(seconds * 0.37 + 0.8) * 0.9 * motionStrength;
  const currentX2 = Math.sin(seconds * 0.29 + 1.7) * -1.45 * motionStrength;
  const currentY2 = Math.cos(seconds * 0.46 + 1.1) * 0.55 * motionStrength;
  const currentOpacity1 = 0.58 + Math.sin(seconds * 0.42 + 0.4) * 0.08;
  const currentOpacity2 = 0.22 + Math.sin(seconds * 0.31 + 2.2) * 0.04;

  const refractionX = Math.sin(seconds * 0.41 + 0.5) * 1.7 * motionStrength;
  const refractionY = Math.cos(seconds * 0.27 + 1.2) * 0.65 * motionStrength;
  const refractionScaleX = 1 + Math.sin(seconds * 0.34 + 0.7) * 0.0018 * motionStrength;
  const refractionOpacity = 0.42 + Math.sin(seconds * 0.48 + 0.2) * 0.07;

  // Nammu is not animated as a conventional character. Her source-supported
  // environmental coherence rises through the water, peaks, and then softens.
  const coherence = interpolate(
    progress,
    [0, 0.18, 0.25, 0.55, 0.75, 0.94, 1],
    [0.03, 0.05, 0.18, 0.54, 0.78, 0.42, 0.16],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const coherenceX = Math.sin(seconds * 0.23 + 0.6) * 0.9 * motionStrength;
  const coherenceY = Math.cos(seconds * 0.19 + 1.5) * 0.7 * motionStrength;
  const coherenceBrightness = 1 + coherence * 0.045;
  const coherenceContrast = 1 + coherence * 0.018;

  return (
    <AbsoluteFill style={styles.root}>
      <div
        style={{
          ...styles.camera,
          transform: `translate3d(${cameraX}px, ${cameraY}px, 0) scale(${cameraScale})`,
        }}
      >
        <Img src={staticFile(deepWaterAsset)} style={styles.layer} />

        <Img
          src={staticFile(midCurrentAsset)}
          style={{
            ...styles.layer,
            opacity: currentOpacity1,
            transform: `translate3d(${currentX1}px, ${currentY1}px, 0)`,
          }}
        />
        <Img
          src={staticFile(midCurrentAsset)}
          style={{
            ...styles.layer,
            opacity: currentOpacity2,
            transform: `translate3d(${currentX2}px, ${currentY2}px, 0)`,
          }}
        />

        <Img
          src={staticFile(surfaceRefractionAsset)}
          style={{
            ...styles.layer,
            opacity: refractionOpacity,
            transformOrigin: '50% 12%',
            transform: `translate3d(${refractionX}px, ${refractionY}px, 0) scaleX(${refractionScaleX})`,
          }}
        />

        <Img
          src={staticFile(nammuCoherenceAsset)}
          style={{
            ...styles.layer,
            opacity: coherence,
            filter: `brightness(${coherenceBrightness}) contrast(${coherenceContrast})`,
            transform: `translate3d(${coherenceX}px, ${coherenceY}px, 0)`,
          }}
        />
      </div>

      <AbsoluteFill style={styles.vignette} />

      {showReviewGuides ? (
        <div style={styles.reviewGuide}>
          <strong>Shot 4 candidate · environmental coherence</strong>
          <span>
            {Math.round(progress * 100)}% · coherence {coherence.toFixed(2)} · strength{' '}
            {motionStrength.toFixed(1)}
          </span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    backgroundColor: '#071317',
    overflow: 'hidden',
  },
  empty: {
    backgroundColor: '#071317',
  },
  camera: {
    position: 'absolute',
    inset: 0,
    transformOrigin: '50% 50%',
    willChange: 'transform',
  },
  layer: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    willChange: 'transform, filter, opacity',
  },
  vignette: {
    pointerEvents: 'none',
    boxShadow: 'inset 0 0 190px rgba(2, 12, 17, 0.12)',
  },
  reviewGuide: {
    position: 'absolute',
    left: 36,
    right: 36,
    bottom: 42,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 24,
    padding: '12px 16px',
    borderRadius: 12,
    background: 'rgba(3, 14, 18, 0.76)',
    color: 'rgba(238, 244, 241, 0.94)',
    fontFamily: 'sans-serif',
    fontSize: 20,
    letterSpacing: 0.2,
  },
};
