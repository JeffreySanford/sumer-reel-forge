import React from 'react';
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export interface Shot03LayeredCandidatePreviewProps {
  backgroundAsset?: string;
  waterAsset?: string;
  vesselAsset?: string;
  enkiAsset?: string;
  motionStrength?: number;
  showReviewGuides?: boolean;
}

interface WaterBand {
  id: string;
  clipPath: string;
  phase: number;
  direction: 1 | -1;
  amplitude: number;
  speed: number;
}

const WATER_BANDS: WaterBand[] = [
  { id: 'upper', clipPath: 'inset(0 0 67% 0)', phase: 0.2, direction: 1, amplitude: 2.6, speed: 0.72 },
  { id: 'upper-mid', clipPath: 'inset(29% 0 42% 0)', phase: 1.1, direction: -1, amplitude: 3.4, speed: 0.56 },
  { id: 'lower-mid', clipPath: 'inset(55% 0 17% 0)', phase: 2.0, direction: 1, amplitude: 4.1, speed: 0.43 },
  { id: 'lower', clipPath: 'inset(79% 0 0 0)', phase: 2.8, direction: -1, amplitude: 3.2, speed: 0.61 },
];

export function Shot03LayeredCandidatePreview({
  backgroundAsset,
  waterAsset,
  vesselAsset,
  enkiAsset,
  motionStrength = 1,
  showReviewGuides = false,
}: Shot03LayeredCandidatePreviewProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  if (!backgroundAsset || !waterAsset || !vesselAsset || !enkiAsset) {
    return <AbsoluteFill style={styles.empty} />;
  }

  const seconds = frame / fps;
  const progress = frame / Math.max(1, durationInFrames - 1);

  // A single slow physical response is shared by the vessel and Enki so the
  // character remains planted on the boat instead of floating independently.
  const hullInertia =
    Math.sin(seconds * 0.72 + 0.15) * 0.68 +
    Math.sin(seconds * 0.29 + 0.9) * 0.32;
  const boatX = hullInertia * 3.4 * motionStrength;
  const boatY = Math.cos(seconds * 0.43 + 0.3) * 1.45 * motionStrength;
  const boatRotation =
    Math.sin(seconds * 0.47 + 0.55) * 0.18 * motionStrength;

  const breath = Math.sin(seconds * 0.82 + 0.35);
  const enkiY = boatY + breath * 0.58 * motionStrength;
  const enkiScaleX = 1 + breath * 0.00045 * motionStrength;
  const enkiScaleY = 1 + breath * 0.00105 * motionStrength;

  const waterGlobalX =
    (Math.sin(seconds * 0.48) * 1.35 +
      Math.sin(seconds * 0.19 + 0.7) * 0.65) *
    motionStrength;
  const waterY = Math.cos(seconds * 0.36 + 0.25) * 0.7 * motionStrength;
  const waterBrightness =
    1 + Math.sin(seconds * 0.51 + 0.9) * 0.01 * motionStrength;

  return (
    <AbsoluteFill style={styles.root}>
      <Img src={staticFile(backgroundAsset)} style={styles.layer} />

      {WATER_BANDS.map((band) => {
        const localX =
          Math.sin(seconds * band.speed + band.phase) *
          band.amplitude *
          band.direction *
          motionStrength;
        return (
          <Img
            key={band.id}
            src={staticFile(waterAsset)}
            style={{
              ...styles.layer,
              clipPath: band.clipPath,
              opacity: 0.97,
              filter: `brightness(${waterBrightness})`,
              transform: `translate3d(${waterGlobalX + localX}px, ${waterY}px, 0)`,
            }}
          />
        );
      })}

      <Img
        src={staticFile(vesselAsset)}
        style={{
          ...styles.layer,
          transformOrigin: '50% 63%',
          transform: `translate3d(${boatX}px, ${boatY}px, 0) rotate(${boatRotation}deg)`,
        }}
      />

      <Img
        src={staticFile(enkiAsset)}
        style={{
          ...styles.layer,
          transformOrigin: '50% 45%',
          transform: `translate3d(${boatX}px, ${enkiY}px, 0) rotate(${boatRotation}deg) scaleX(${enkiScaleX}) scaleY(${enkiScaleY})`,
        }}
      />

      <AbsoluteFill style={styles.vignette} />

      {showReviewGuides ? (
        <div style={styles.reviewGuide}>
          <strong>Shot 3 layered candidate · background + water + vessel + Enki</strong>
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
    boxShadow: 'inset 0 0 180px rgba(3, 11, 14, 0.16)',
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
    background: 'rgba(4, 15, 19, 0.76)',
    color: 'rgba(238, 244, 241, 0.94)',
    fontFamily: 'sans-serif',
    fontSize: 20,
    letterSpacing: 0.2,
  },
};
