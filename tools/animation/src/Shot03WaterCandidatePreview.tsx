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

interface WaterBand {
  id: string;
  clipPath: string;
  phase: number;
  direction: 1 | -1;
  xAmplitude: number;
  yAmplitude: number;
  speed: number;
}

const WATER_BANDS: WaterBand[] = [
  {
    id: 'upper',
    clipPath: 'inset(0 0 67% 0)',
    phase: 0.2,
    direction: 1,
    xAmplitude: 5.5,
    yAmplitude: 1.3,
    speed: 0.72,
  },
  {
    id: 'upper-mid',
    clipPath: 'inset(29% 0 42% 0)',
    phase: 1.1,
    direction: -1,
    xAmplitude: 7.2,
    yAmplitude: 1.8,
    speed: 0.56,
  },
  {
    id: 'lower-mid',
    clipPath: 'inset(55% 0 17% 0)',
    phase: 2.0,
    direction: 1,
    xAmplitude: 8.6,
    yAmplitude: 2.1,
    speed: 0.43,
  },
  {
    id: 'lower',
    clipPath: 'inset(79% 0 0 0)',
    phase: 2.8,
    direction: -1,
    xAmplitude: 6.8,
    yAmplitude: 1.5,
    speed: 0.61,
  },
];

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
  const globalDriftX =
    (Math.sin(seconds * 0.54) * 2.4 +
      Math.sin(seconds * 0.21 + 0.8) * 1.2) *
    motionStrength;
  const globalDriftY =
    (Math.cos(seconds * 0.41 + 0.3) * 1.05 +
      Math.sin(seconds * 0.18) * 0.5) *
    motionStrength;
  const scale =
    1 + Math.sin(seconds * 0.34 + 0.4) * 0.0035 * motionStrength;
  const brightness =
    1 + Math.sin(seconds * 0.51 + 0.9) * 0.022 * motionStrength;

  return (
    <AbsoluteFill style={styles.root}>
      <Img src={staticFile(sourceAsset)} style={styles.artwork} />

      {WATER_BANDS.map((band) => {
        const localX =
          Math.sin(seconds * band.speed + band.phase) *
          band.xAmplitude *
          band.direction *
          motionStrength;
        const localY =
          Math.cos(seconds * (band.speed * 0.73) + band.phase) *
          band.yAmplitude *
          motionStrength;
        const shear =
          Math.sin(seconds * (band.speed * 0.47) + band.phase) *
          0.22 *
          motionStrength;

        return (
          <Img
            key={band.id}
            src={staticFile(waterAsset)}
            style={{
              ...styles.water,
              clipPath: band.clipPath,
              opacity: 0.985,
              filter: `brightness(${brightness}) saturate(1.018)`,
              transform: `translate3d(${globalDriftX + localX}px, ${globalDriftY + localY}px, 0) skewX(${shear}deg) scale(${scale})`,
            }}
          />
        );
      })}

      <Img
        src={staticFile(waterAsset)}
        style={{
          ...styles.water,
          opacity: 0.1,
          mixBlendMode: 'screen',
          filter: 'blur(0.55px) brightness(1.08)',
          transform: `translate3d(${-globalDriftX * 0.8}px, ${globalDriftY * 0.45}px, 0) scale(${1 + (scale - 1) * 0.75})`,
        }}
      />

      <AbsoluteFill style={styles.vignette} />

      {showReviewGuides ? (
        <div style={styles.reviewGuide}>
          <strong>shot03-water-v1 diagnostic motion</strong>
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
