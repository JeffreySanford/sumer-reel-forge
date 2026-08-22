import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const shotLength = 180;

export function CinematicMotionProof() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const shot = Math.min(2, Math.floor(frame / shotLength));
  const localFrame = frame - shot * shotLength;
  const localProgress = clamp(localFrame / shotLength, 0, 1);
  const fullProgress = frame / durationInFrames;
  const exposure = interpolate(
    frame,
    [0, 180, 360, 540],
    [0.78, 0.86, 0.94, 0.9],
  );

  return (
    <AbsoluteFill style={styles.root}>
      <div style={styles.canvasTexture} />
      <ShotMatte shot={shot} localProgress={localProgress} />
      <div style={styles.grade} />
      <div style={{ ...styles.exposure, opacity: exposure }} />
      <Caption shot={shot} fullProgress={fullProgress} />
      <div style={styles.safeArea} />
    </AbsoluteFill>
  );
}

function ShotMatte({
  shot,
  localProgress,
}: {
  shot: number;
  localProgress: number;
}) {
  const frame = useCurrentFrame();
  const enter = ease(localProgress);
  const cutFade = Math.min(1, localProgress * 7, (1 - localProgress) * 7);

  if (shot === 0) {
    return (
      <div style={{ ...styles.shot, opacity: cutFade }}>
        <Camera x={interpolate(enter, [0, 1], [32, -46])} y={-24} scale={1.04}>
          <Sky mood="dawn" progress={localProgress} />
          <DistantTemple progress={localProgress} />
          <River progress={localProgress} />
          <Boat progress={localProgress} />
          <Reeds progress={localProgress} density={24} opacity={0.72} />
          <Particles progress={localProgress} seed={0} />
        </Camera>
      </div>
    );
  }

  if (shot === 1) {
    const headTurn = interpolate(frame, [180, 255, 330, 360], [-10, 5, -2, 4]);
    return (
      <div style={{ ...styles.shot, opacity: cutFade }}>
        <Camera
          x={interpolate(enter, [0, 1], [-22, -80])}
          y={interpolate(enter, [0, 1], [-90, -138])}
          scale={interpolate(enter, [0, 1], [1.12, 1.22])}
        >
          <Sky mood="close" progress={localProgress} />
          <River progress={localProgress} />
          <ProfileGuide headTurn={headTurn} progress={localProgress} />
          <LightSweep progress={localProgress} />
          <Reeds progress={localProgress} density={16} opacity={0.46} />
          <Particles progress={localProgress} seed={1} />
        </Camera>
      </div>
    );
  }

  return (
    <div style={{ ...styles.shot, opacity: cutFade }}>
      <Camera
        x={interpolate(enter, [0, 1], [-96, -190])}
        y={interpolate(enter, [0, 1], [-150, -235])}
        scale={interpolate(enter, [0, 1], [1.1, 1.02])}
      >
        <Sky mood="reveal" progress={localProgress} />
        <DistantTemple progress={1 - localProgress * 0.3} reveal />
        <River progress={localProgress} wide />
        <LightSweep progress={localProgress} />
        <Reeds progress={localProgress} density={28} opacity={0.58} />
        <Particles progress={localProgress} seed={2} />
      </Camera>
    </div>
  );
}

function Camera({
  x,
  y,
  scale,
  children,
}: {
  x: number;
  y: number;
  scale: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        ...styles.camera,
        transform: `translate(${x}px, ${y}px) scale(${scale})`,
      }}
    >
      {children}
    </div>
  );
}

function Sky({
  mood,
  progress,
}: {
  mood: 'dawn' | 'close' | 'reveal';
  progress: number;
}) {
  const palettes = {
    dawn: 'linear-gradient(180deg, #243c42 0%, #8d7656 48%, #c69d59 100%)',
    close: 'linear-gradient(180deg, #20383f 0%, #72634f 54%, #b88950 100%)',
    reveal: 'linear-gradient(180deg, #2f5960 0%, #a1885b 46%, #d2a85a 100%)',
  };

  return (
    <AbsoluteFill style={{ background: palettes[mood] }}>
      <div
        style={{
          ...styles.sun,
          transform: `translate(${progress * 28}px, ${progress * 42}px)`,
        }}
      />
      <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
        <g opacity="0.18" transform={`translate(${progress * 64} 0)`}>
          <path d="M88 80 L285 1920 H178 L22 128 Z" fill="#eed69d" />
          <path d="M332 40 L650 1920 H544 L270 78 Z" fill="#f3d27c" />
          <path d="M760 0 L938 1920 H826 L700 38 Z" fill="#eadfbf" />
        </g>
      </svg>
    </AbsoluteFill>
  );
}

function DistantTemple({
  progress,
  reveal = false,
}: {
  progress: number;
  reveal?: boolean;
}) {
  const lift = reveal ? interpolate(progress, [0, 1], [90, 0]) : 0;
  const opacity = reveal ? interpolate(progress, [0, 1], [0.42, 0.88]) : 0.72;

  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      <g transform={`translate(${-progress * 42} ${lift})`}>
        <path
          d="M-60 940 C140 820 318 910 520 792 C716 678 900 736 1160 604 L1160 1200 L-60 1200 Z"
          fill="#31443f"
          opacity={opacity}
        />
        <path d="M650 560 h78 v336 h-78z" fill="#4c3f25" opacity="0.9" />
        <path d="M748 468 h128 v428 h-128z" fill="#67522e" opacity="0.94" />
        <path d="M896 612 h74 v284 h-74z" fill="#423824" opacity="0.82" />
        <path d="M714 436 h196 l-98 -104z" fill="#96713d" opacity="0.95" />
        <path
          d="M620 904 H1015"
          stroke="#c8a35e"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.34"
        />
      </g>
    </svg>
  );
}

function River({
  progress,
  wide = false,
}: {
  progress: number;
  wide?: boolean;
}) {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 24) * 20 + progress * 44;
  const shimmer = Math.sin(frame / 11) * 0.12 + 0.24;

  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      <path d="M-80 915 H1160 V2040 H-80 Z" fill="#153e45" />
      <path
        d="M-80 1080 C128 1018 288 1138 508 1064 C704 998 866 1070 1160 984 V1266 H-80 Z"
        fill="#23646b"
        opacity={wide ? 0.82 : 0.7}
      />
      <path
        d="M-80 1235 C150 1162 358 1280 610 1196 C808 1130 940 1194 1160 1140 V1458 H-80 Z"
        fill="#0c3038"
        opacity="0.78"
      />
      {Array.from({ length: 18 }).map((_, index) => (
        <path
          key={index}
          d={`M${-20 + index * 74 + drift} ${1012 + index * 48} h${74 + (index % 4) * 30}`}
          fill="none"
          stroke={index % 2 ? '#e5bf70' : '#90b9a8'}
          strokeLinecap="round"
          strokeWidth={index % 3 === 0 ? 5 : 3}
          opacity={shimmer + (index % 3) * 0.035}
        />
      ))}
    </svg>
  );
}

function Boat({ progress }: { progress: number }) {
  const frame = useCurrentFrame();
  const bob = Math.sin(frame / 16) * 11;
  const x = interpolate(progress, [0, 1], [170, 356]);
  const tilt = Math.sin(frame / 26) * 1.6;

  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      <g transform={`translate(${x} ${1306 + bob}) rotate(${tilt})`}>
        <path
          d="M-170 22 C-60 82 170 82 302 22 C250 132 -88 144 -170 22 Z"
          fill="#76502e"
        />
        <path
          d="M-118 4 C26 48 156 48 258 5"
          fill="none"
          stroke="#cda25a"
          strokeWidth="16"
          strokeLinecap="round"
          opacity="0.88"
        />
        <path
          d="M-12 -34 C52 -64 138 -60 206 -28"
          fill="none"
          stroke="#4c3423"
          strokeWidth="11"
          strokeLinecap="round"
          opacity="0.8"
        />
      </g>
    </svg>
  );
}

function ProfileGuide({
  headTurn,
  progress,
}: {
  headTurn: number;
  progress: number;
}) {
  const frame = useCurrentFrame();
  const breath = Math.sin(frame / 28) * 5;
  const cloth = Math.sin(frame / 19) * 12;
  const blink = [228, 229, 230, 348, 349, 350].includes(frame) ? 0.12 : 1;
  const armLift = interpolate(ease(progress), [0, 1], [0, -24]);

  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      <g transform={`translate(404 ${1054 + breath})`}>
        <ellipse
          cx="86"
          cy="562"
          rx="190"
          ry="38"
          fill="#041619"
          opacity="0.34"
        />
        <path
          d="M-40 258 C-70 90 -28 12 64 -10 C134 -26 190 92 152 258 C98 292 18 292 -40 258 Z"
          fill="#98603c"
        />
        <path
          d={`M-60 106 C-10 54 92 42 166 104 L${154 + cloth} 294 L${-40 - cloth * 0.35} 294 Z`}
          fill="#21464d"
        />
        <path
          d="M-48 122 C-2 166 80 176 166 112"
          fill="none"
          stroke="#cba35d"
          strokeLinecap="round"
          strokeWidth="13"
          opacity="0.92"
        />
        <path
          d="M-42 138 C-174 110 -232 16 -212 -78"
          fill="none"
          stroke="#875539"
          strokeLinecap="round"
          strokeWidth="29"
          style={{
            transform: `rotate(${armLift}deg)`,
            transformOrigin: '-42px 138px',
          }}
        />
        <g transform={`translate(0 0) rotate(${headTurn})`}>
          <path
            d="M70 -92 C24 -86 -12 -58 -32 -12 C8 -36 56 -44 112 -24 C92 -62 116 -90 164 -102 C138 -130 94 -122 70 -92 Z"
            fill="#171511"
          />
          <path
            d="M-28 -10 C-34 -74 12 -118 72 -110 C128 -102 164 -54 150 2 C138 52 32 70 -28 -10 Z"
            fill="#a6673f"
          />
          <ellipse cx="104" cy="-18" rx="15" ry={5 * blink} fill="#15110e" />
          <path
            d="M72 -18 C98 -8 118 4 138 26 C104 28 76 22 52 8 Z"
            fill="#7b452b"
            opacity="0.45"
          />
          <path
            d="M126 42 C102 58 70 58 46 42"
            fill="none"
            stroke="#5d321f"
            strokeLinecap="round"
            strokeWidth="7"
            opacity="0.8"
          />
        </g>
      </g>
    </svg>
  );
}

function Reeds({
  progress,
  density,
  opacity,
}: {
  progress: number;
  density: number;
  opacity: number;
}) {
  const frame = useCurrentFrame();
  const sway = Math.sin(frame / 34) * 22;

  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      <g transform={`translate(${-progress * 138} 0)`} opacity={opacity}>
        {Array.from({ length: density }).map((_, index) => (
          <path
            key={index}
            d={`M${index * 58 - 170} 1980 C${index * 58 - 124 + sway} 1668 ${index * 58 - 205 - sway * 0.52} 1428 ${index * 58 - 116 + sway * 0.24} 1052`}
            fill="none"
            stroke={index % 3 === 0 ? '#b38a43' : '#071819'}
            strokeLinecap="round"
            strokeWidth={index % 3 === 0 ? 9 : 22}
          />
        ))}
      </g>
    </svg>
  );
}

function LightSweep({ progress }: { progress: number }) {
  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      <g opacity="0.2" transform={`translate(${progress * 120 - 50} 0)`}>
        <path d="M210 40 L520 1920 H410 L150 92 Z" fill="#f0d895" />
        <path
          d="M540 0 L760 1920 H650 L476 54 Z"
          fill="#f8df9f"
          opacity="0.6"
        />
      </g>
    </svg>
  );
}

function Particles({ progress, seed }: { progress: number; seed: number }) {
  const frame = useCurrentFrame();

  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      {Array.from({ length: 38 }).map((_, index) => {
        const drift =
          ((frame * (0.35 + index * 0.015) + index * 47 + seed * 80) % 1260) +
          170;
        return (
          <circle
            key={index}
            cx={40 + index * 31 + progress * 160}
            cy={drift}
            r={index % 5 === 0 ? 3.2 : 1.8}
            fill="#efd087"
            opacity={0.08 + (index % 5) * 0.03}
          />
        );
      })}
    </svg>
  );
}

function Caption({
  shot,
  fullProgress,
}: {
  shot: number;
  fullProgress: number;
}) {
  const captions = [
    'Motion proof: river approach, heavier parallax, and boat drift.',
    'Motion proof: profile close-up with breathing, blink, cloth, and gesture channels.',
    'Motion proof: city reveal with light sweep, atmosphere, and restrained camera move.',
  ];

  return (
    <div style={styles.captionBand}>
      <div style={styles.caption}>{captions[shot]}</div>
      <div style={styles.progressTrack}>
        <div
          style={{ ...styles.progressFill, width: `${fullProgress * 100}%` }}
        />
      </div>
    </div>
  );
}

function ease(value: number) {
  const safe = clamp(value, 0, 1);
  return safe * safe * (3 - 2 * safe);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: 1080,
    height: 1920,
    overflow: 'hidden',
    backgroundColor: '#162c30',
    fontFamily: 'Arial, sans-serif',
  },
  shot: {
    position: 'absolute',
    inset: 0,
  },
  camera: {
    position: 'absolute',
    inset: -110,
  },
  svgLayer: {
    position: 'absolute',
    inset: 0,
    width: 1080,
    height: 1920,
  },
  canvasTexture: {
    position: 'absolute',
    inset: 0,
    background:
      'radial-gradient(circle at 16% 28%, rgba(255,255,255,0.08) 0 1px, transparent 1px), radial-gradient(circle at 72% 54%, rgba(0,0,0,0.13) 0 1px, transparent 1px)',
    backgroundSize: '19px 19px, 31px 31px',
    opacity: 0.34,
  },
  sun: {
    position: 'absolute',
    left: 116,
    top: 124,
    width: 250,
    height: 250,
    borderRadius: '50%',
    background: '#d0a052',
    boxShadow: '0 0 120px rgba(226, 181, 91, 0.42)',
  },
  grade: {
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(180deg, rgba(20, 24, 24, 0.08), rgba(7, 22, 26, 0.52)), radial-gradient(circle at 47% 34%, transparent 0%, rgba(4, 10, 12, 0.54) 80%)',
    mixBlendMode: 'multiply',
    pointerEvents: 'none',
  },
  exposure: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(237, 208, 146, 0.09)',
    mixBlendMode: 'screen',
    pointerEvents: 'none',
  },
  captionBand: {
    position: 'absolute',
    left: 80,
    right: 80,
    bottom: 178,
    padding: '22px 30px 18px',
    background: 'rgba(7, 17, 18, 0.8)',
    borderTop: '4px solid #c9a15a',
  },
  caption: {
    color: '#fff',
    fontSize: 38,
    lineHeight: 1.17,
    textAlign: 'center',
    textShadow: '0 2px 8px rgba(0,0,0,0.82)',
  },
  progressTrack: {
    height: 4,
    marginTop: 16,
    background: 'rgba(255,255,255,0.15)',
  },
  progressFill: {
    height: 4,
    background: '#d1aa63',
  },
  safeArea: {
    position: 'absolute',
    inset: 72,
    border: '2px solid rgba(255,255,255,0.08)',
    pointerEvents: 'none',
  },
};
