import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { REEL_ONE } from '../../../libs/reel-core/src/lib/reel-core';

const shotStarts = REEL_ONE.shots.reduce<number[]>((starts, shot, index) => {
  starts.push(
    index === 0
      ? 0
      : starts[index - 1] + REEL_ONE.shots[index - 1].durationSeconds * 30,
  );
  return starts;
}, []);

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

export function FullReelAnimation() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;
  const activeShot = findShot(frame);

  return (
    <AbsoluteFill style={styles.root}>
      <div style={styles.texture} />
      {REEL_ONE.shots.map((shot, index) => (
        <Sequence
          key={shot.time}
          from={shotStarts[index]}
          durationInFrames={shot.durationSeconds * 30}
        >
          <ReelShot shotIndex={index} />
        </Sequence>
      ))}
      <div style={{ ...styles.grade, opacity: 0.82 + progress * 0.08 }} />
      <Caption frame={frame} />
      <ShotMarker activeShot={activeShot} />
      <TitleFade frame={frame} />
      <div style={styles.safeArea} />
    </AbsoluteFill>
  );
}

function ReelShot({ shotIndex }: { shotIndex: number }) {
  const frame = useCurrentFrame();
  const shot = REEL_ONE.shots[shotIndex];
  const duration = shot.durationSeconds * 30;
  const progress = frame / duration;
  const eased = ease(progress);
  const cameraX = interpolate(
    eased,
    [0, 1],
    [shotIndex % 2 ? -34 : 28, shotIndex % 2 ? -92 : -44],
  );
  const cameraY = interpolate(eased, [0, 1], [0, -66 - shotIndex * 4]);
  const cameraScale = interpolate(eased, [0, 1], [1.02, 1.1]);
  const opacity = Math.min(1, progress * 6, (1 - progress) * 8);

  return (
    <AbsoluteFill style={{ opacity }}>
      <div
        style={{
          ...styles.camera,
          transform: `translate(${cameraX}px, ${cameraY}px) scale(${cameraScale})`,
        }}
      >
        <Sky shotIndex={shotIndex} progress={progress} />
        <WaterPlanes shotIndex={shotIndex} progress={progress} />
        <ShotSubject shotIndex={shotIndex} progress={progress} />
        <Foreground shotIndex={shotIndex} progress={progress} />
        <Atmosphere shotIndex={shotIndex} progress={progress} />
      </div>
    </AbsoluteFill>
  );
}

function Sky({ shotIndex, progress }: { shotIndex: number; progress: number }) {
  const palettes = [
    ['#101d24', '#4a5350', '#a27643'],
    ['#203840', '#79684d', '#bc8b4a'],
    ['#2c4c54', '#887252', '#d2a35a'],
    ['#152a35', '#214654', '#5a8a87'],
    ['#372b20', '#7d5430', '#d7a65c'],
    ['#2b322b', '#756744', '#d0a054'],
    ['#355d63', '#9a835c', '#d6ad62'],
    ['#2d5860', '#9c8050', '#e1b867'],
  ][shotIndex];

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${palettes[0]} 0%, ${palettes[1]} 48%, ${palettes[2]} 100%)`,
      }}
    >
      <div
        style={{
          ...styles.sun,
          transform: `translate(${progress * 54}px, ${progress * 72}px)`,
          opacity: shotIndex === 0 ? 0.32 : 0.72,
        }}
      />
      <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
        <g
          opacity="0.2"
          transform={`translate(${progress * 110 - shotIndex * 16} 0)`}
        >
          <path d="M80 60 L300 1920 H180 L20 120 Z" fill="#efd68c" />
          <path
            d="M344 20 L675 1920 H548 L284 80 Z"
            fill="#f6d78e"
            opacity="0.7"
          />
          <path
            d="M770 0 L940 1920 H830 L700 60 Z"
            fill="#eadfbd"
            opacity="0.56"
          />
        </g>
      </svg>
    </AbsoluteFill>
  );
}

function WaterPlanes({
  shotIndex,
  progress,
}: {
  shotIndex: number;
  progress: number;
}) {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 20) * 18 + progress * 80;
  const deep = shotIndex === 3;

  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      <path
        d="M-80 900 H1160 V2040 H-80 Z"
        fill={deep ? '#082c3c' : '#16464c'}
      />
      <path
        d="M-80 1070 C130 1000 310 1140 528 1058 C724 984 890 1062 1160 980 V1280 H-80 Z"
        fill={deep ? '#0e4a5c' : '#23646b'}
        opacity="0.72"
      />
      <path
        d="M-80 1245 C150 1168 368 1290 612 1196 C826 1114 958 1202 1160 1135 V1480 H-80 Z"
        fill={deep ? '#071f2c' : '#0d3038'}
        opacity="0.78"
      />
      {Array.from({ length: 18 }).map((_, index) => (
        <path
          key={index}
          d={`M${-35 + index * 78 + drift} ${1008 + index * 48} h${68 + (index % 4) * 32}`}
          fill="none"
          stroke={index % 2 ? '#e4bd70' : '#8eb8a5'}
          strokeLinecap="round"
          strokeWidth={index % 3 === 0 ? 5 : 3}
          opacity={0.16 + (index % 3) * 0.04}
        />
      ))}
    </svg>
  );
}

function ShotSubject({
  shotIndex,
  progress,
}: {
  shotIndex: number;
  progress: number;
}) {
  if (shotIndex === 0) {
    return <HorizonMist progress={progress} />;
  }
  if (shotIndex === 1 || shotIndex === 7) {
    return <Boat progress={progress} finalShot={shotIndex === 7} />;
  }
  if (shotIndex === 2) {
    return <EnkiAtHelm progress={progress} />;
  }
  if (shotIndex === 3) {
    return <NammuWaterPresence progress={progress} />;
  }
  if (shotIndex === 4) {
    return <TravelerShrine progress={progress} />;
  }
  if (shotIndex === 5) {
    return <SymbolMontage progress={progress} />;
  }
  return <DilmunReveal progress={progress} />;
}

function HorizonMist({ progress }: { progress: number }) {
  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      <path
        d="M-60 900 C180 822 326 900 540 820 C720 750 930 770 1160 690 L1160 1060 L-60 1060 Z"
        fill="#313f3a"
        opacity={0.34 + progress * 0.25}
      />
      <path
        d="M0 782 H1080"
        stroke="#d2a55a"
        strokeWidth="5"
        opacity={0.22 + progress * 0.24}
      />
    </svg>
  );
}

function Boat({
  progress,
  finalShot = false,
}: {
  progress: number;
  finalShot?: boolean;
}) {
  const frame = useCurrentFrame();
  const bob = Math.sin(frame / 15) * 11;
  const x = finalShot
    ? interpolate(progress, [0, 1], [270, 455])
    : interpolate(progress, [0, 1], [90, 360]);
  const y = finalShot ? 1240 : 1310;
  const scale = finalShot ? 1.15 : 1;

  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      <g transform={`translate(${x} ${y + bob}) scale(${scale})`}>
        <path
          d="M-190 38 C-60 102 174 102 326 38 C262 164 -106 172 -190 38 Z"
          fill="#744e2c"
        />
        <path
          d="M-132 16 C22 62 168 64 284 18"
          fill="none"
          stroke="#cda45b"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M28 -38 C92 -72 182 -66 242 -28"
          fill="none"
          stroke="#4a3222"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M42 -120 C86 -150 142 -148 178 -112 L168 -24 H62 Z"
          fill="#214b50"
          opacity={finalShot ? 0.75 : 0.55}
        />
        <circle
          cx="116"
          cy="-152"
          r="34"
          fill="#9d623d"
          opacity={finalShot ? 0.7 : 0.5}
        />
      </g>
    </svg>
  );
}

function EnkiAtHelm({ progress }: { progress: number }) {
  const frame = useCurrentFrame();
  const breath = Math.sin(frame / 26) * 5;
  const cloth = Math.sin(frame / 18) * 12;
  const turn = interpolate(progress, [0, 0.55, 1], [-8, 7, 2]);

  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      <g transform={`translate(458 ${1018 + breath})`}>
        <ellipse
          cx="92"
          cy="608"
          rx="210"
          ry="40"
          fill="#041619"
          opacity="0.34"
        />
        <path
          d="M-40 276 C-76 98 -22 12 70 -12 C150 -30 210 94 168 276 C108 310 20 310 -40 276 Z"
          fill="#9b613d"
        />
        <path
          d={`M-70 108 C-14 50 100 42 180 104 L${166 + cloth} 322 L${-46 - cloth * 0.35} 322 Z`}
          fill="#224a50"
        />
        <path
          d="M-54 128 C-2 176 92 184 180 116"
          fill="none"
          stroke="#caa45f"
          strokeLinecap="round"
          strokeWidth="14"
        />
        <g transform={`rotate(${turn})`}>
          <path
            d="M70 -92 C22 -86 -16 -58 -34 -8 C10 -36 58 -42 116 -22 C94 -62 120 -92 168 -102 C138 -132 92 -122 70 -92 Z"
            fill="#171511"
          />
          <path
            d="M-28 -10 C-34 -76 12 -120 76 -112 C132 -104 170 -52 152 4 C138 58 32 72 -28 -10 Z"
            fill="#a76840"
          />
          <ellipse cx="106" cy="-17" rx="14" ry="4" fill="#14100d" />
          <path
            d="M126 42 C102 58 72 58 48 42"
            fill="none"
            stroke="#5d321f"
            strokeLinecap="round"
            strokeWidth="7"
          />
        </g>
      </g>
    </svg>
  );
}

function NammuWaterPresence({ progress }: { progress: number }) {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame / 24) * 0.06 + 0.62;

  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      <g opacity={pulse} transform={`translate(0 ${progress * 36})`}>
        <path
          d="M210 1180 C340 910 626 870 786 1080 C650 1036 494 1094 402 1248 C346 1342 270 1306 210 1180 Z"
          fill="#6da8a0"
          opacity="0.24"
        />
        <path
          d="M430 1012 C510 946 650 956 710 1050"
          fill="none"
          stroke="#a9ddd0"
          strokeWidth="15"
          strokeLinecap="round"
          opacity="0.28"
        />
        <path
          d="M514 1098 C568 1138 636 1136 690 1090"
          fill="none"
          stroke="#d5efe5"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.3"
        />
      </g>
    </svg>
  );
}

function TravelerShrine({ progress }: { progress: number }) {
  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      <g transform={`translate(${-progress * 54} 0)`}>
        <path d="M132 930 H574 V1280 H132 Z" fill="#70512f" opacity="0.78" />
        <path d="M96 930 H610 L352 768 Z" fill="#a2743b" opacity="0.86" />
        <path
          d="M678 1032 C730 960 840 960 890 1032 V1242 H678 Z"
          fill="#5a3e25"
          opacity="0.8"
        />
        <circle cx="778" cy="1112" r="52" fill="#e0a04c" opacity="0.5" />
        <path
          d="M246 1238 C320 1198 420 1198 500 1238"
          fill="none"
          stroke="#d0a35a"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M620 1288 C724 1248 842 1248 948 1288"
          fill="none"
          stroke="#8bb8a8"
          strokeWidth="12"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

function SymbolMontage({ progress }: { progress: number }) {
  const shift = interpolate(ease(progress), [0, 1], [-60, 70]);
  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      <g transform={`translate(${shift} 0)`} opacity="0.86">
        <ellipse
          cx="230"
          cy="1160"
          rx="118"
          ry="40"
          fill="#8fc0b0"
          opacity="0.58"
        />
        <path d="M444 1070 h172 v118 h-172z" fill="#b07a3f" />
        <path
          d="M472 1098 h112 M472 1130 h92 M472 1162 h122"
          stroke="#4b3320"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M742 1040 V1232 M650 1120 H834 M674 1128 C692 1190 746 1190 764 1128 M786 1128 C804 1190 858 1190 876 1128"
          fill="none"
          stroke="#cda45b"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M112 1340 C320 1280 638 1308 1010 1250"
          fill="none"
          stroke="#d9aa5d"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.44"
        />
      </g>
    </svg>
  );
}

function DilmunReveal({ progress }: { progress: number }) {
  const lift = interpolate(ease(progress), [0, 1], [110, -20]);
  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      <g transform={`translate(${-progress * 80} ${lift})`}>
        <path
          d="M-80 930 C150 780 330 890 540 762 C730 646 920 700 1160 578 L1160 1220 L-80 1220 Z"
          fill="#365145"
          opacity="0.8"
        />
        <path d="M650 546 h78 v348 h-78z" fill="#5a4829" />
        <path d="M758 466 h132 v428 h-132z" fill="#75602f" />
        <path d="M910 620 h76 v274 h-76z" fill="#4b3c24" />
        <path d="M724 432 h200 l-100 -104z" fill="#a2763e" />
      </g>
    </svg>
  );
}

function Foreground({
  shotIndex,
  progress,
}: {
  shotIndex: number;
  progress: number;
}) {
  const frame = useCurrentFrame();
  const sway = Math.sin(frame / 32) * 20;
  const density = shotIndex === 5 ? 10 : 22;

  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      <g
        transform={`translate(${-progress * 140} 0)`}
        opacity={shotIndex === 3 ? 0.42 : 0.66}
      >
        {Array.from({ length: density }).map((_, index) => (
          <path
            key={index}
            d={`M${index * 66 - 180} 1980 C${index * 66 - 126 + sway} 1660 ${index * 66 - 212 - sway * 0.5} 1428 ${index * 66 - 122 + sway * 0.24} 1060`}
            fill="none"
            stroke={index % 3 === 0 ? '#b28a43' : '#071819'}
            strokeLinecap="round"
            strokeWidth={index % 3 === 0 ? 9 : 21}
          />
        ))}
      </g>
    </svg>
  );
}

function Atmosphere({
  shotIndex,
  progress,
}: {
  shotIndex: number;
  progress: number;
}) {
  const frame = useCurrentFrame();
  return (
    <svg viewBox="0 0 1080 1920" style={styles.svgLayer}>
      {Array.from({ length: 34 }).map((_, index) => {
        const y =
          ((frame * (0.32 + index * 0.018) + index * 51 + shotIndex * 33) %
            1220) +
          170;
        return (
          <circle
            key={index}
            cx={40 + index * 34 + progress * 140}
            cy={y}
            r={index % 5 === 0 ? 3.3 : 1.8}
            fill="#efd087"
            opacity={0.08 + (index % 5) * 0.028}
          />
        );
      })}
    </svg>
  );
}

function Caption({ frame }: { frame: number }) {
  const caption = captions.find(
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

function ShotMarker({ activeShot }: { activeShot: number }) {
  return (
    <div style={styles.shotMarker}>
      <div>{REEL_ONE.shots[activeShot]?.motion}</div>
      <div style={styles.shotMarkerLine} />
    </div>
  );
}

function TitleFade({ frame }: { frame: number }) {
  const opacity =
    frame < 95
      ? interpolate(frame, [0, 35, 95], [1, 1, 0])
      : frame > 1640
        ? interpolate(frame, [1640, 1740, 1800], [0, 1, 1])
        : 0;
  if (opacity <= 0) {
    return null;
  }
  return (
    <AbsoluteFill style={{ ...styles.titleFade, opacity }}>
      <div style={styles.series}>{REEL_ONE.series}</div>
      <div style={styles.title}>{REEL_ONE.title}</div>
    </AbsoluteFill>
  );
}

function findShot(frame: number) {
  for (let index = shotStarts.length - 1; index >= 0; index -= 1) {
    if (frame >= shotStarts[index]) {
      return index;
    }
  }
  return 0;
}

function parseTime(value: string) {
  const [minutes, seconds] = value.split(':').map(Number);
  return minutes * 60 + seconds;
}

function ease(value: number) {
  const safe = Math.min(1, Math.max(0, value));
  return safe * safe * (3 - 2 * safe);
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: 1080,
    height: 1920,
    overflow: 'hidden',
    backgroundColor: '#152a30',
    fontFamily: 'Arial, sans-serif',
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
  texture: {
    position: 'absolute',
    inset: 0,
    background:
      'radial-gradient(circle at 16% 28%, rgba(255,255,255,0.08) 0 1px, transparent 1px), radial-gradient(circle at 72% 54%, rgba(0,0,0,0.13) 0 1px, transparent 1px)',
    backgroundSize: '19px 19px, 31px 31px',
    opacity: 0.34,
  },
  sun: {
    position: 'absolute',
    left: 112,
    top: 118,
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
  shotMarker: {
    position: 'absolute',
    left: 86,
    right: 86,
    top: 112,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 24,
    textTransform: 'uppercase',
  },
  shotMarkerLine: {
    width: 112,
    height: 3,
    marginTop: 12,
    background: '#c9a15a',
  },
  titleFade: {
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(8, 17, 19, 0.68)',
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
    fontSize: 108,
    lineHeight: 1.02,
  },
  safeArea: {
    position: 'absolute',
    inset: 72,
    border: '2px solid rgba(255,255,255,0.08)',
    pointerEvents: 'none',
  },
};
