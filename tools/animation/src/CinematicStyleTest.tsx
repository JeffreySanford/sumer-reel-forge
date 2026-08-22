import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export function CinematicStyleTest() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;
  const cameraX = interpolate(frame, [0, durationInFrames], [0, -38]);
  const cameraY = interpolate(frame, [0, durationInFrames], [0, -64]);
  const cameraScale = interpolate(frame, [0, durationInFrames], [1, 1.055]);

  return (
    <AbsoluteFill style={styles.root}>
      <div style={styles.texture} />
      <div
        style={{
          ...styles.camera,
          transform: `translate(${cameraX}px, ${cameraY}px) scale(${cameraScale})`,
        }}
      >
        <PaintedSky progress={progress} />
        <TempleSilhouette progress={progress} />
        <RiverPlanes />
        <ProfileFigure />
        <ReedVeil progress={progress} />
        <DustMotes progress={progress} />
      </div>
      <div style={styles.grade} />
      <Caption />
      <div style={styles.safeArea} />
    </AbsoluteFill>
  );
}

function PaintedSky({ progress }: { progress: number }) {
  return (
    <AbsoluteFill
      style={{
        background:
          'linear-gradient(180deg, #263f45 0%, #8f7855 48%, #d0a963 100%)',
      }}
    >
      <div
        style={{
          ...styles.sun,
          transform: `translate(${progress * -28}px, ${progress * 42}px)`,
        }}
      />
      <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
        <g opacity="0.24" transform={`translate(${progress * 48} 0)`}>
          <path d="M96 120 L315 1920 H178 L18 162 Z" fill="#f1d184" />
          <path d="M308 88 L660 1920 H548 L250 112 Z" fill="#ead5a0" />
          <path d="M760 40 L918 1920 H826 L694 70 Z" fill="#f1d184" />
        </g>
      </svg>
    </AbsoluteFill>
  );
}

function TempleSilhouette({ progress }: { progress: number }) {
  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      <g transform={`translate(${-progress * 22} 0)`}>
        <path
          d="M-40 932 C170 826 318 908 506 810 C708 705 890 732 1160 620 L1160 1188 L-40 1188 Z"
          fill="#34433b"
          opacity="0.72"
        />
        <path d="M678 542 h68 v350 h-68z" fill="#534326" opacity="0.82" />
        <path d="M760 470 h112 v422 h-112z" fill="#66502b" opacity="0.88" />
        <path d="M890 592 h70 v300 h-70z" fill="#443821" opacity="0.78" />
        <path d="M738 438 h162 l-82 -88z" fill="#92713b" opacity="0.92" />
        <path
          d="M650 908 H990"
          stroke="#c9a15a"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.36"
        />
      </g>
    </svg>
  );
}

function RiverPlanes() {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 26) * 18;

  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      <path d="M0 930 H1080 V1920 H0 Z" fill="#173e45" />
      <path
        d={`M-80 1080 C120 1018 280 1136 498 1068 C706 1004 850 1070 1160 990 V1250 H-80 Z`}
        fill="#23646b"
        opacity="0.72"
      />
      <path
        d="M-80 1225 C150 1162 358 1280 610 1196 C808 1130 940 1194 1160 1140 V1438 H-80 Z"
        fill="#0d2f38"
        opacity="0.74"
      />
      {Array.from({ length: 12 }).map((_, index) => (
        <path
          key={index}
          d={`M${40 + index * 92 + drift} ${1038 + index * 58} h${60 + (index % 4) * 28}`}
          fill="none"
          stroke={index % 2 ? '#e4c174' : '#8eb4a4'}
          strokeLinecap="round"
          strokeWidth={index % 3 === 0 ? 5 : 3}
          opacity={0.14 + (index % 3) * 0.055}
        />
      ))}
    </svg>
  );
}

function ProfileFigure() {
  const frame = useCurrentFrame();
  const breath = Math.sin(frame / 30) * 5;
  const cloth = Math.sin(frame / 23) * 10;

  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      <g transform={`translate(420 ${1058 + breath})`}>
        <ellipse
          cx="80"
          cy="560"
          rx="190"
          ry="38"
          fill="#041619"
          opacity="0.32"
        />
        <path
          d="M-40 258 C-70 90 -28 12 64 -10 C134 -26 190 92 152 258 C98 292 18 292 -40 258 Z"
          fill="#9b5f38"
        />
        <path
          d={`M-60 106 C-10 54 92 42 166 104 L${154 + cloth} 294 L${-40 - cloth * 0.35} 294 Z`}
          fill="#23474d"
        />
        <path
          d="M-48 122 C-2 166 80 176 166 112"
          fill="none"
          stroke="#caa35e"
          strokeLinecap="round"
          strokeWidth="13"
          opacity="0.92"
        />
        <path
          d="M70 -92 C24 -86 -12 -58 -32 -12 C8 -36 56 -44 112 -24 C92 -62 116 -90 164 -102 C138 -130 94 -122 70 -92 Z"
          fill="#171511"
        />
        <path
          d="M-28 -10 C-34 -74 12 -118 72 -110 C128 -102 164 -54 150 2 C138 52 32 70 -28 -10 Z"
          fill="#a7673d"
        />
        <path
          d="M72 -18 C98 -8 118 4 138 26 C104 28 76 22 52 8 Z"
          fill="#7b452b"
          opacity="0.45"
        />
        <path
          d="M108 -18 C130 -14 146 -6 160 8"
          fill="none"
          stroke="#15110e"
          strokeLinecap="round"
          strokeWidth="7"
        />
        <path
          d="M126 42 C102 58 70 58 46 42"
          fill="none"
          stroke="#5d321f"
          strokeLinecap="round"
          strokeWidth="7"
          opacity="0.8"
        />
        <path
          d="M-40 138 C-170 112 -228 20 -210 -76"
          fill="none"
          stroke="#8b5434"
          strokeLinecap="round"
          strokeWidth="28"
          opacity="0.95"
        />
      </g>
    </svg>
  );
}

function ReedVeil({ progress }: { progress: number }) {
  const frame = useCurrentFrame();
  const sway = Math.sin(frame / 36) * 20;

  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      <g transform={`translate(${-progress * 96} 0)`}>
        {Array.from({ length: 20 }).map((_, index) => (
          <path
            key={index}
            d={`M${index * 72 - 130} 1960 C${index * 72 - 90 + sway} 1660 ${index * 72 - 170 - sway * 0.5} 1430 ${index * 72 - 80 + sway * 0.25} 1048`}
            fill="none"
            stroke={index % 2 ? '#081919' : '#94713a'}
            strokeLinecap="round"
            strokeWidth={index % 2 ? 24 : 10}
            opacity={index % 2 ? 0.86 : 0.74}
          />
        ))}
      </g>
    </svg>
  );
}

function DustMotes({ progress }: { progress: number }) {
  const frame = useCurrentFrame();

  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      {Array.from({ length: 32 }).map((_, index) => {
        const y = ((frame * (0.45 + index * 0.02) + index * 57) % 1260) + 180;
        return (
          <circle
            key={index}
            cx={60 + index * 34 + progress * 150}
            cy={y}
            r={index % 4 === 0 ? 3.4 : 1.9}
            fill="#f0d185"
            opacity={0.1 + (index % 5) * 0.032}
          />
        );
      })}
    </svg>
  );
}

function Caption() {
  return (
    <div style={styles.captionBand}>
      <div style={styles.caption}>
        Cinematic illustrated motion test: slower camera, richer light, and
        layered atmosphere.
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: 1080,
    height: 1920,
    overflow: 'hidden',
    backgroundColor: '#182f32',
    fontFamily: 'Arial, sans-serif',
  },
  camera: {
    position: 'absolute',
    inset: -90,
  },
  svgLayer: {
    position: 'absolute',
    inset: 0,
    width: 1080,
    height: 1920,
  },
  texture: {
    position: 'absolute',
    inset: 0,
    background:
      'radial-gradient(circle at 18% 30%, rgba(255,255,255,0.08) 0 1px, transparent 1px), radial-gradient(circle at 70% 52%, rgba(0,0,0,0.12) 0 1px, transparent 1px)',
    backgroundSize: '17px 17px, 29px 29px',
    opacity: 0.32,
  },
  sun: {
    position: 'absolute',
    left: 98,
    top: 128,
    width: 248,
    height: 248,
    borderRadius: '50%',
    background: '#d2a14f',
    boxShadow: '0 0 110px rgba(222, 178, 92, 0.42)',
  },
  grade: {
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(180deg, rgba(18, 25, 26, 0.08), rgba(9, 24, 28, 0.5)), radial-gradient(circle at 48% 32%, transparent 0%, rgba(4, 10, 12, 0.52) 80%)',
    mixBlendMode: 'multiply',
    pointerEvents: 'none',
  },
  captionBand: {
    position: 'absolute',
    left: 80,
    right: 80,
    bottom: 180,
    padding: '22px 30px',
    background: 'rgba(7, 17, 18, 0.78)',
    borderTop: '4px solid #caa35e',
  },
  caption: {
    color: '#fff',
    fontSize: 39,
    lineHeight: 1.18,
    textAlign: 'center',
    textShadow: '0 2px 8px rgba(0,0,0,0.8)',
  },
  safeArea: {
    position: 'absolute',
    inset: 72,
    border: '2px solid rgba(255,255,255,0.08)',
    pointerEvents: 'none',
  },
};
