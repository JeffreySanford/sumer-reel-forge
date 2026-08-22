import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { MouthShape, proofScene } from './scene-data';

export function ReelAnimation() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;
  const cameraX = interpolate(frame, [0, durationInFrames], [0, -80]);
  const cameraY = interpolate(frame, [0, durationInFrames], [0, -46]);
  const cameraScale = interpolate(frame, [0, durationInFrames], [1, 1.075]);
  const grade = interpolate(frame, [0, durationInFrames], [0.78, 0.92]);
  const entrance = spring({ frame, fps, config: { damping: 24 } });

  return (
    <AbsoluteFill style={styles.root}>
      <div style={styles.paperGrain} />
      <div
        style={{
          ...styles.camera,
          transform: `translate(${cameraX}px, ${cameraY}px) scale(${cameraScale})`,
        }}
      >
        <Sky progress={progress} />
        <DistantCity progress={progress} />
        <Water />
        <LightRays progress={progress} />
        <ReedBank progress={progress} />
        <Boat entrance={entrance} />
        <Guide />
        <Atmosphere progress={progress} />
        <ForegroundReeds progress={progress} />
      </div>
      <div style={{ ...styles.colorGrade, opacity: grade }} />
      <TitleCard />
      <CaptionTrack />
      <SafeArea />
    </AbsoluteFill>
  );
}

function Sky({ progress }: { progress: number }) {
  return (
    <AbsoluteFill
      style={{
        background:
          'linear-gradient(180deg, #497f93 0%, #d9b56f 52%, #efe1bd 100%)',
      }}
    >
      <div
        style={{
          ...styles.sun,
          transform: `translateY(${progress * 80}px)`,
        }}
      />
      <div style={{ ...styles.cloud, left: 76 + progress * 54, top: 248 }} />
      <div style={{ ...styles.cloud, left: 690 - progress * 74, top: 328 }} />
    </AbsoluteFill>
  );
}

function DistantCity({ progress }: { progress: number }) {
  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      <g transform={`translate(${-progress * 28} 0)`}>
        <path
          d="M0 980 C180 900 320 940 500 880 C660 826 850 858 1080 790 L1080 1160 L0 1160 Z"
          fill="#6d755a"
          opacity="0.6"
        />
        <path d="M700 716 h52 v190 h-52z" fill="#80683d" />
        <path d="M765 670 h72 v236 h-72z" fill="#977646" />
        <path d="M852 736 h44 v170 h-44z" fill="#705c38" />
        <path d="M747 645 h110 l-55 -58z" fill="#c89c55" />
      </g>
    </svg>
  );
}

function Water() {
  const frame = useCurrentFrame();
  const wave = Math.sin(frame / 18) * 16;
  const glint = Math.sin(frame / 24) * 28;

  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      <defs>
        <linearGradient id="waterDepth" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#3e7f82" />
          <stop offset="52%" stopColor="#235f69" />
          <stop offset="100%" stopColor="#173d48" />
        </linearGradient>
      </defs>
      <rect x="0" y="930" width="1080" height="990" fill="url(#waterDepth)" />
      {Array.from({ length: 16 }).map((_, index) => (
        <path
          key={index}
          d={`M${-120 + index * 88 + wave} ${1040 + index * 42} C${20 + index * 88} ${1016 + index * 42}, ${78 + index * 88} ${1080 + index * 42}, ${220 + index * 88} ${1046 + index * 42}`}
          fill="none"
          stroke={index % 2 ? '#9ec0ab' : '#d6ad58'}
          strokeLinecap="round"
          strokeWidth={index % 2 ? 5 : 3}
          opacity={index % 2 ? 0.25 : 0.32}
        />
      ))}
      {Array.from({ length: 10 }).map((_, index) => (
        <path
          key={`glint-${index}`}
          d={`M${90 + index * 104 + glint} ${1120 + index * 54} h${70 + (index % 3) * 42}`}
          fill="none"
          stroke="#f2d08b"
          strokeLinecap="round"
          strokeWidth={index % 2 ? 4 : 2}
          opacity={0.18 + (index % 3) * 0.05}
        />
      ))}
    </svg>
  );
}

function LightRays({ progress }: { progress: number }) {
  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      <g opacity="0.22" transform={`translate(${progress * 40} 0)`}>
        <path d="M142 260 L360 1920 H205 L74 298 Z" fill="#f7e3a6" />
        <path
          d="M305 210 L700 1920 H574 L250 250 Z"
          fill="#f7d98b"
          opacity="0.6"
        />
      </g>
    </svg>
  );
}

function ReedBank({ progress }: { progress: number }) {
  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      <g transform={`translate(${-progress * 90} 0)`}>
        <path
          d="M-80 1120 C140 1030 250 1190 430 1090 C560 1015 760 1120 1160 1024 L1160 1320 L-80 1320 Z"
          fill="#3a583f"
        />
        {Array.from({ length: 26 }).map((_, index) => (
          <path
            key={index}
            d={`M${index * 46 - 28} 1170 c${index % 2 ? -18 : 20} -130 ${index % 3 ? 8 : -12} -210 ${index % 2 ? 46 : -34} -285`}
            fill="none"
            stroke={index % 2 ? '#223625' : '#d0aa5f'}
            strokeLinecap="round"
            strokeWidth={index % 2 ? 10 : 7}
          />
        ))}
      </g>
    </svg>
  );
}

function Boat({ entrance }: { entrance: number }) {
  const frame = useCurrentFrame();
  const bob = Math.sin(frame / 15) * 10;
  const tilt = Math.sin(frame / 22) * 1.4;

  return (
    <svg
      viewBox="0 0 1080 1920"
      style={{
        ...styles.svgLayer,
        transform: `translate(${interpolate(entrance, [0, 1], [140, 0])}px, ${bob}px) rotate(${tilt}deg)`,
        transformOrigin: '540px 1390px',
      }}
    >
      <path
        d="M210 1348 C370 1420 690 1420 872 1348 C810 1486 326 1496 210 1348 Z"
        fill="#8d6434"
      />
      <path
        d="M260 1330 C450 1382 640 1385 824 1330"
        fill="none"
        stroke="#d6ad58"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        d="M350 1296 C462 1252 604 1254 720 1296"
        fill="none"
        stroke="#5c3f25"
        strokeWidth="12"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Guide() {
  const frame = useCurrentFrame();
  const gesture = spring({
    frame: frame - 250,
    fps: 30,
    config: { damping: 14, stiffness: 70 },
  });
  const headTurn = interpolate(frame, [0, 320, 600, 900], [-6, 7, -3, 5]);
  const breathing = Math.sin(frame / 28) * 5;
  const clothSway = Math.sin(frame / 20) * 8;
  const mouthShape = getMouthShape(frame);
  const blinkScale = [118, 119, 120, 398, 399, 400, 712, 713, 714].includes(
    frame,
  )
    ? 0.12
    : 1;

  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      <g transform={`translate(520 ${1160 + breathing})`}>
        <ellipse
          cx="10"
          cy="410"
          rx="170"
          ry="34"
          fill="#071a1d"
          opacity="0.26"
        />
        <path
          d={`M-64 236 C-86 92 -50 0 0 -10 C55 -18 98 82 75 236 C40 252 -22 254 -64 236 Z`}
          fill="#c48752"
        />
        <path
          d={`M-72 88 C-24 48 38 46 90 88 L${72 + clothSway} 250 L${-58 - clothSway * 0.4} 250 Z`}
          fill="#315d62"
        />
        <path
          d="M-46 110 C-22 150 10 185 54 220"
          fill="none"
          stroke="#1f4349"
          strokeWidth="8"
          opacity="0.55"
        />
        <path
          d="M-76 88 C-40 124 35 132 92 86"
          fill="none"
          stroke="#d6ad58"
          strokeWidth="12"
        />
        <path
          d="M-62 128 C-170 95 -198 20 -192 -54"
          fill="none"
          stroke="#9d6a3e"
          strokeWidth="30"
          strokeLinecap="round"
          style={{
            transform: `rotate(${interpolate(gesture, [0, 1], [0, -24])}deg)`,
            transformOrigin: '-58px 132px',
          }}
        />
        <path
          d="M78 126 C168 88 192 30 198 -42"
          fill="none"
          stroke="#9d6a3e"
          strokeWidth="30"
          strokeLinecap="round"
        />
        <g transform={`translate(0 -92) rotate(${headTurn})`}>
          <path
            d="M-70 -10 C-74 -78 -30 -122 28 -116 C82 -110 112 -54 86 10 C64 62 -44 66 -70 -10 Z"
            fill="#a7663d"
          />
          <path
            d="M-76 -42 C-52 -132 48 -144 96 -54 C56 -82 -8 -74 -76 -42 Z"
            fill="#171613"
          />
          <path
            d="M-46 -16 C-28 -58 24 -74 70 -46 C52 -20 18 -6 -46 -16 Z"
            fill="#7f4a30"
            opacity="0.34"
          />
          <ellipse
            cx="-20"
            cy="-20"
            rx="13"
            ry={4 * blinkScale}
            fill="#14110f"
          />
          <ellipse
            cx="42"
            cy="-16"
            rx="13"
            ry={4 * blinkScale}
            fill="#14110f"
          />
          <path
            d="M16 -10 C28 2 24 14 8 18"
            fill="none"
            stroke="#633821"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <Mouth shape={mouthShape} />
          <path
            d="M-44 40 C-18 68 34 70 66 34"
            fill="none"
            stroke="#6c3c24"
            strokeWidth="7"
            strokeLinecap="round"
            opacity="0.45"
          />
        </g>
      </g>
    </svg>
  );
}

function Mouth({ shape }: { shape: MouthShape }) {
  if (shape === 'open') {
    return <ellipse cx="12" cy="30" rx="15" ry="20" fill="#3b1f1a" />;
  }
  if (shape === 'wide') {
    return (
      <path
        d="M-12 28 Q12 44 42 28"
        fill="none"
        stroke="#3b1f1a"
        strokeWidth="9"
        strokeLinecap="round"
      />
    );
  }
  return (
    <path
      d="M-8 30 Q10 36 32 30"
      fill="none"
      stroke="#3b1f1a"
      strokeWidth="5"
      strokeLinecap="round"
    />
  );
}

function ForegroundReeds({ progress }: { progress: number }) {
  const frame = useCurrentFrame();
  const sway = Math.sin(frame / 34) * 18;

  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      <g transform={`translate(${-progress * 170} 0)`}>
        {Array.from({ length: 18 }).map((_, index) => (
          <path
            key={index}
            d={`M${index * 72 - 120} 1940 C${index * 72 - 70 + sway} 1660 ${index * 72 - 170 - sway * 0.4} 1460 ${index * 72 - 82 + sway * 0.2} 1210`}
            fill="none"
            stroke={index % 2 ? '#18261d' : '#253c27'}
            strokeLinecap="round"
            strokeWidth={index % 2 ? 22 : 16}
          />
        ))}
      </g>
    </svg>
  );
}

function Atmosphere({ progress }: { progress: number }) {
  const frame = useCurrentFrame();

  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      {Array.from({ length: 20 }).map((_, index) => {
        const drift =
          ((frame * (0.35 + index * 0.03) + index * 61) % 1200) - 120;
        return (
          <circle
            key={index}
            cx={80 + index * 58 + progress * 110}
            cy={drift + 420}
            r={index % 3 === 0 ? 3.2 : 2.1}
            fill="#f4d895"
            opacity={0.12 + (index % 4) * 0.035}
          />
        );
      })}
    </svg>
  );
}

function TitleCard() {
  return (
    <Sequence from={0} durationInFrames={120}>
      <AbsoluteFill style={styles.titleCard}>
        <div style={styles.series}>{proofScene.series}</div>
        <div style={styles.title}>{proofScene.title}</div>
        <div style={styles.kicker}>cinematic animation proof</div>
      </AbsoluteFill>
    </Sequence>
  );
}

function CaptionTrack() {
  const frame = useCurrentFrame();
  const caption = proofScene.captions.find(
    (item) => frame >= item.startFrame && frame <= item.endFrame,
  );
  if (!caption) {
    return null;
  }

  return (
    <div style={styles.captionBand}>
      <div style={styles.caption}>{caption.text}</div>
    </div>
  );
}

function SafeArea() {
  return <div style={styles.safeArea} />;
}

function getMouthShape(frame: number): MouthShape {
  return (
    proofScene.mouthCues.find(
      (cue) => frame >= cue.startFrame && frame <= cue.endFrame,
    )?.shape ?? 'rest'
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: 1080,
    height: 1920,
    backgroundColor: '#142829',
    overflow: 'hidden',
    fontFamily: 'Arial, sans-serif',
  },
  paperGrain: {
    position: 'absolute',
    inset: 0,
    background:
      'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.08) 0 1px, transparent 1px), radial-gradient(circle at 70% 60%, rgba(0,0,0,0.09) 0 1px, transparent 1px)',
    backgroundSize: '18px 18px, 23px 23px',
    opacity: 0.28,
  },
  camera: {
    position: 'absolute',
    inset: -90,
  },
  colorGrade: {
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(180deg, rgba(38, 25, 20, 0.18), rgba(7, 25, 29, 0.36)), radial-gradient(circle at 45% 30%, transparent 0%, rgba(5, 13, 16, 0.42) 78%)',
    mixBlendMode: 'multiply',
    pointerEvents: 'none',
  },
  svgLayer: {
    position: 'absolute',
    inset: 0,
    width: 1080,
    height: 1920,
  },
  sun: {
    position: 'absolute',
    width: 214,
    height: 214,
    borderRadius: '50%',
    left: 132,
    top: 154,
    background: '#e4bd63',
    boxShadow: '0 0 90px rgba(228, 189, 99, 0.52)',
  },
  cloud: {
    position: 'absolute',
    width: 270,
    height: 76,
    borderRadius: 999,
    background: 'rgba(247, 232, 190, 0.42)',
    filter: 'blur(1px)',
  },
  titleCard: {
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(20, 32, 31, 0.72)',
    color: '#fff',
    textAlign: 'center',
  },
  series: {
    color: '#d6ad58',
    fontSize: 38,
    fontWeight: 800,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 22,
    maxWidth: 820,
    fontFamily: 'Georgia, serif',
    fontSize: 116,
    lineHeight: 1.02,
  },
  kicker: {
    marginTop: 28,
    fontSize: 34,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  captionBand: {
    position: 'absolute',
    left: 80,
    right: 80,
    bottom: 210,
    padding: '22px 32px',
    background: 'rgba(16, 25, 24, 0.78)',
    borderTop: '4px solid #d6ad58',
  },
  caption: {
    color: '#fff',
    fontSize: 44,
    lineHeight: 1.16,
    textAlign: 'center',
    textShadow: '0 2px 8px rgba(0,0,0,0.75)',
  },
  safeArea: {
    position: 'absolute',
    inset: 72,
    border: '2px solid rgba(255,255,255,0.08)',
    pointerEvents: 'none',
  },
};
