import React from 'react';
import { Img, staticFile } from 'remotion';
import type { SceneV2Layer } from './scene-v2';

export function ContainedWaterMaterialLayer({
  layer,
  frame,
  progress,
  fps,
}: {
  layer: SceneV2Layer;
  frame: number;
  progress: number;
  fps: number;
}) {
  const phase = frame / fps;
  const source = staticFile(layer.assetPath);
  const settle =
    progress > 0.88
      ? Math.max(0.55, 1 - (progress - 0.88) / 0.12)
      : 1;

  const filterA = `${safeSvgId(layer.id)}-water-refraction-a`;
  const filterB = `${safeSvgId(layer.id)}-water-refraction-b`;

  // Fine material motion: actual source pixels refract inside the fixed basin mask.
  const displacementA =
    (20 + Math.sin(phase * 0.73 + 0.4) * 5 + Math.sin(phase * 0.29) * 2.5) *
    settle;
  const displacementB =
    (11 + Math.cos(phase * 0.51 + 1.2) * 3.5) * settle;

  const frequencyAX = 0.0095 + Math.sin(phase * 0.31 + 0.2) * 0.0018;
  const frequencyAY = 0.021 + Math.cos(phase * 0.27 + 0.8) * 0.0028;
  const frequencyBX = 0.017 + Math.cos(phase * 0.23 + 1.1) * 0.0022;
  const frequencyBY = 0.011 + Math.sin(phase * 0.37 + 0.5) * 0.0016;

  const driftAX =
    (Math.sin(phase * 0.83 + 0.25) * 2.8 +
      Math.sin(phase * 0.34 + 1.4) * 1.2) *
    settle;
  const driftAY = Math.cos(phase * 0.57 + 0.6) * 1.4 * settle;
  const driftBX = Math.cos(phase * 0.48 + 1.3) * 2.1 * settle;
  const driftBY = Math.sin(phase * 0.39 + 0.4) * 1.1 * settle;

  const glintDrift =
    (Math.sin(phase * 0.91) * 42 +
      Math.sin(phase * 0.33 + 1.1) * 18) *
    settle;
  const counterDrift =
    (Math.cos(phase * 0.61 + 0.6) * 31 +
      Math.sin(phase * 0.25) * 13) *
    settle;

  const maskStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    maskImage: `url("${source}")`,
    WebkitMaskImage: `url("${source}")`,
    maskSize: 'cover',
    WebkitMaskSize: 'cover',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    pointerEvents: 'none',
  };

  const movingTexture: React.CSSProperties = {
    position: 'absolute',
    inset: '-2%',
    width: '104%',
    height: '104%',
    objectFit: 'cover',
    transformOrigin: '53% 82%',
    willChange: 'transform, opacity, filter',
  };

  const rippleOrigins = [0, 0.36, 0.72];

  return (
    <>
      <svg
        aria-hidden="true"
        width="0"
        height="0"
        style={{ position: 'absolute' }}
      >
        <defs>
          <filter
            id={filterA}
            x="-12%"
            y="-12%"
            width="124%"
            height="124%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency={`${frequencyAX.toFixed(5)} ${frequencyAY.toFixed(5)}`}
              numOctaves={2}
              seed={17}
              result="waterNoiseA"
            />
            <feGaussianBlur
              in="waterNoiseA"
              stdDeviation="0.65"
              result="waterNoiseASoft"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="waterNoiseASoft"
              scale={displacementA}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <filter
            id={filterB}
            x="-10%"
            y="-10%"
            width="120%"
            height="120%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="turbulence"
              baseFrequency={`${frequencyBX.toFixed(5)} ${frequencyBY.toFixed(5)}`}
              numOctaves={2}
              seed={31}
              result="waterNoiseB"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="waterNoiseB"
              scale={displacementB}
              xChannelSelector="B"
              yChannelSelector="R"
            />
          </filter>
        </defs>
      </svg>

      <div style={maskStyle}>
        <Img
          src={source}
          style={{
            ...movingTexture,
            opacity: 0.93,
            mixBlendMode: 'normal',
            filter: `url(#${filterA}) contrast(1.08) brightness(1.035) saturate(1.07)`,
            transform: `translate3d(${driftAX}px, ${driftAY}px, 0) scale(1.012)`,
          }}
        />
        <Img
          src={source}
          style={{
            ...movingTexture,
            opacity: 0.3,
            mixBlendMode: 'screen',
            filter: `url(#${filterB}) contrast(1.12) brightness(1.06) saturate(0.94)`,
            transform: `translate3d(${driftBX}px, ${driftBY}px, 0) scale(1.009)`,
          }}
        />
      </div>

      {/*
        Readable low-frequency motion. These perspective-flattened wave fronts
        expand across the fixed basin mask, giving the eye a physical ripple to
        track while the turbulence above supplies fine refraction detail.
      */}
      <div style={maskStyle} data-water-motion="broad-traveling-ripple">
        {rippleOrigins.map((offset, index) => {
          const cycle = positiveModulo(phase * 0.22 + offset, 1);
          const envelope = Math.sin(Math.PI * cycle) * settle;
          const scaleX = 0.42 + cycle * 2.75;
          const scaleY = 0.38 + cycle * 2.05;
          const opacity = envelope * (index === 0 ? 0.52 : 0.42);
          const travelX = Math.sin(phase * 0.31 + index * 1.7) * 5;
          const travelY = cycle * 7 - 3;

          return (
            <React.Fragment key={`ripple-${index}`}>
              <div
                style={{
                  position: 'absolute',
                  left: '53%',
                  top: '82.5%',
                  width: '18%',
                  height: '5.8%',
                  borderRadius: '50%',
                  border: '2.2px solid rgba(255,243,205,0.9)',
                  boxShadow:
                    '0 0 9px rgba(255,230,176,0.48), inset 0 0 7px rgba(255,241,205,0.36)',
                  opacity,
                  mixBlendMode: 'screen',
                  filter: 'blur(0.65px)',
                  transformOrigin: '50% 50%',
                  transform: `translate3d(calc(-50% + ${travelX}px), calc(-50% + ${travelY}px), 0) scaleX(${scaleX}) scaleY(${scaleY})`,
                  willChange: 'transform, opacity',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '53%',
                  top: '82.5%',
                  width: '18%',
                  height: '5.8%',
                  borderRadius: '50%',
                  border: '3.5px solid rgba(58,48,30,0.48)',
                  opacity: envelope * 0.2,
                  mixBlendMode: 'multiply',
                  filter: 'blur(2px)',
                  transformOrigin: '50% 50%',
                  transform: `translate3d(calc(-50% + ${travelX}px), calc(-50% + ${travelY + 2}px), 0) scaleX(${scaleX * 1.035}) scaleY(${scaleY * 1.05})`,
                  willChange: 'transform, opacity',
                }}
              />
            </React.Fragment>
          );
        })}
      </div>

      <div
        style={{
          ...maskStyle,
          opacity: 0.38 + Math.sin(phase * 0.66 + 0.4) * 0.065,
          mixBlendMode: 'screen',
          background:
            'repeating-linear-gradient(102deg, transparent 0 24px, rgba(255,239,196,0.38) 29px 35px, transparent 41px 63px)',
          filter: 'blur(1px)',
          transform: `translate3d(${glintDrift}px, ${Math.sin(phase * 0.44) * 2.2}px, 0)`,
          willChange: 'transform, opacity',
        }}
      />

      <div
        style={{
          ...maskStyle,
          opacity: 0.25 + Math.cos(phase * 0.49 + 1.3) * 0.045,
          mixBlendMode: 'soft-light',
          background:
            'repeating-linear-gradient(80deg, transparent 0 35px, rgba(116,187,195,0.34) 41px 49px, transparent 56px 82px)',
          filter: 'blur(1.6px)',
          transform: `translate3d(${counterDrift}px, ${Math.sin(phase * 0.41 + 0.5) * 2.5}px, 0)`,
          willChange: 'transform, opacity',
        }}
      />
    </>
  );
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function safeSvgId(value: string): string {
  return value.replace(/[^a-z0-9_-]/gi, '-');
}
