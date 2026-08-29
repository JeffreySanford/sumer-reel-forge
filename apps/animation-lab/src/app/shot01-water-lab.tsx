import { useEffect, useState } from 'react';
import styles from './shot01-water-lab.module.css';

type WaterParameters = {
  horizontalCurrent: number;
  verticalRipple: number;
  flowSpeed: number;
  rippleScale: number;
};

interface WaterAudition {
  schemaVersion: 1;
  id: string;
  state: 'rendered-non-canonical-audition';
  sourceShotNumber: 1;
  createdAt: string;
  parameters: WaterParameters;
  scenePath: string;
  videoPath: string;
  videoUrl: string;
  guardrails: string[];
}

const SOURCE_URL = '/api/forge/shot-1-water-auditions/source';
const PREVIEW_LOOP_SECONDS = 6;

const DEFAULTS: WaterParameters = {
  horizontalCurrent: 0.58,
  verticalRipple: 0.38,
  flowSpeed: 0.5,
  rippleScale: 0.52,
};

const CONTROLS: Array<{
  id: keyof WaterParameters;
  label: string;
  description: string;
}> = [
  {
    id: 'horizontalCurrent',
    label: 'Horizontal current',
    description:
      'Controls lateral water travel. 0.00 is no sideways current; 1.00 is the strongest source-safe current audition.',
  },
  {
    id: 'verticalRipple',
    label: 'Vertical ripple',
    description:
      'Controls visible up/down water displacement. 0.00 is flat; 1.00 is the strongest vertical ripple audition.',
  },
  {
    id: 'flowSpeed',
    label: 'Flow speed',
    description:
      'Controls temporal rate. 0.00 is very slow heavy water; 1.00 is a clearly faster motion cycle.',
  },
  {
    id: 'rippleScale',
    label: 'Ripple scale',
    description:
      'Controls spatial frequency. 0.00 uses a few broad bands; 1.00 uses many narrower bands with tighter phase spacing.',
  },
];

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let detail = `${url} returned ${response.status}`;
    try {
      const payload = (await response.json()) as { message?: string | string[] };
      if (payload.message) {
        detail = Array.isArray(payload.message)
          ? payload.message.join('; ')
          : payload.message;
      }
    } catch {
      // Preserve HTTP fallback when the error body is not JSON.
    }
    throw new Error(detail);
  }
  return (await response.json()) as T;
}

function usePreviewSeconds(): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.requestAnimationFrame !== 'function'
    ) {
      return;
    }

    const startedAt = window.performance?.now?.() ?? Date.now();
    let lastPaint = startedAt;
    let frameId = 0;

    const tick = (now: number) => {
      if (now - lastPaint >= 1000 / 30) {
        setSeconds((now - startedAt) / 1000);
        lastPaint = now;
      }
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  return seconds;
}

function LiveWaterPreview({ parameters }: { parameters: WaterParameters }) {
  const seconds = usePreviewSeconds();
  const [sourceError, setSourceError] = useState(false);
  const progress = (seconds % PREVIEW_LOOP_SECONDS) / PREVIEW_LOOP_SECONDS;
  const easedProgress = progress * progress * (3 - 2 * progress);

  // Keep this transfer function in lock-step with scene-v2-water-surface.tsx.
  const horizontalAmplitude = parameters.horizontalCurrent * 24;
  const verticalAmplitude = parameters.verticalRipple * 12;
  const cyclesPerSecond = 0.04 + parameters.flowSpeed * 0.56;
  const bandCount = Math.round(3 + parameters.rippleScale * 15);
  const phaseSpacing = 0.35 + parameters.rippleScale * 1.35;
  const waterTop = 55;
  const waterHeight = 45;
  const bandHeight = waterHeight / bandCount;
  const cameraScale = 1 + easedProgress * 0.014;
  const cameraY = easedProgress * -3;
  const mistDrift = -28 + easedProgress * 62;
  const mistBreathe = Math.sin(seconds / 2.7) * 8;
  const dawnPulse = 0.72 + Math.sin(seconds / 0.72) * 0.16;

  return (
    <div
      className={styles.livePreview}
      aria-label="Live Shot 1 water tuning preview"
    >
      <div className={styles.livePreviewStage}>
        <div
          className={styles.livePreviewCamera}
          style={{
            transform: `translate3d(0, ${cameraY}px, 0) scale(${cameraScale})`,
          }}
        >
          <img
            className={styles.previewArtwork}
            src={SOURCE_URL}
            alt="Approved Shot 1 editorial source"
            onError={() => setSourceError(true)}
            onLoad={() => setSourceError(false)}
          />

          <div className={styles.previewWaterField} aria-hidden="true">
            {Array.from({ length: bandCount }, (_unused, index) => {
              const top = waterTop + index * bandHeight;
              const bottom = Math.min(100, top + bandHeight);
              const overlap = Math.min(
                1.2,
                Math.max(0.35, bandHeight * 0.16),
              );
              const normalizedDepth =
                bandCount <= 1 ? 1 : index / (bandCount - 1);
              const depthResponse = 0.65 + normalizedDepth * 0.35;
              const verticalDepthResponse = 0.55 + normalizedDepth * 0.45;
              const phase = index * phaseSpacing;
              const primary =
                (seconds * cyclesPerSecond + phase) * Math.PI * 2;
              const secondary =
                (seconds * cyclesPerSecond * 0.47 + phase * 1.61) *
                Math.PI *
                2;
              const tertiary =
                (seconds * cyclesPerSecond * 0.23 + phase * 2.17) *
                Math.PI *
                2;
              const x =
                (Math.sin(primary) * horizontalAmplitude +
                  Math.sin(secondary) * horizontalAmplitude * 0.32 +
                  Math.sin(tertiary) * horizontalAmplitude * 0.1) *
                depthResponse;
              const y =
                (Math.cos(primary * 0.71) * verticalAmplitude +
                  Math.sin(secondary * 0.83) * verticalAmplitude * 0.28) *
                verticalDepthResponse;
              const scale =
                1.018 +
                parameters.horizontalCurrent * 0.012 +
                parameters.verticalRipple * 0.004;
              const clipTop = Math.max(0, top - overlap);
              const clipBottom = Math.min(100, bottom + overlap);
              const clip = `inset(${clipTop}% 0 ${Math.max(
                0,
                100 - clipBottom,
              )}% 0)`;

              return (
                <img
                  key={index}
                  className={styles.previewSlice}
                  src={SOURCE_URL}
                  alt=""
                  aria-hidden="true"
                  style={{
                    opacity: 1,
                    transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
                    clipPath: clip,
                    WebkitClipPath: clip,
                  }}
                />
              );
            })}
          </div>

          <div
            className={styles.previewMistA}
            aria-hidden="true"
            style={{
              transform: `translate3d(${mistDrift}px, ${mistBreathe}px, 0)`,
            }}
          />
          <div
            className={styles.previewMistB}
            aria-hidden="true"
            style={{
              transform: `translate3d(${-mistDrift * 0.72}px, ${-mistBreathe * 0.5}px, 0)`,
            }}
          />
          <div
            className={styles.previewDawn}
            aria-hidden="true"
            style={{ opacity: dawnPulse }}
          />
        </div>
        <div className={styles.previewVignette} aria-hidden="true" />
        <span className={styles.liveChip}>LIVE TUNING PREVIEW</span>
      </div>

      {sourceError ? (
        <p className={styles.error} role="alert">
          The approved Shot 1 source could not be loaded from the Forge API.
        </p>
      ) : null}
      <p className={styles.previewDisclaimer}>
        Live response: {horizontalAmplitude.toFixed(1)} px lateral ·{' '}
        {verticalAmplitude.toFixed(1)} px vertical ·{' '}
        {cyclesPerSecond.toFixed(2)} cycles/sec · {bandCount} water bands.
      </p>
      <p className={styles.previewDisclaimer}>
        The viewport responds immediately for tuning. Press Render water audition
        to bake the current four slider values into a fresh Remotion MP4.
      </p>
    </div>
  );
}

export function Shot01WaterLab() {
  const [parameters, setParameters] = useState<WaterParameters>(DEFAULTS);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audition, setAudition] = useState<WaterAudition | null>(null);

  const update = (id: keyof WaterParameters, value: number) => {
    setParameters((current) => ({ ...current, [id]: value }));
    setError(null);
  };

  const reset = () => {
    setParameters(DEFAULTS);
    setAudition(null);
    setError(null);
  };

  const renderAudition = async () => {
    setRendering(true);
    setError(null);
    try {
      const result = await postJson<WaterAudition>(
        '/api/forge/shot-1-water-auditions',
        { parameters },
      );
      setAudition(result);
    } catch (renderError) {
      setAudition(null);
      setError(
        renderError instanceof Error ? renderError.message : String(renderError),
      );
    } finally {
      setRendering(false);
    }
  };

  return (
    <section className={styles.panel} aria-label="Shot 1 Forge water lab">
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Shot 1 · Option B</p>
          <h2>Dedicated water-motion audition</h2>
        </div>
        <span className={styles.badge}>non-canonical</span>
      </div>

      <p className={styles.intro}>
        This experiment reuses the exact approved Shot 1 painting and moves only
        clipped horizontal bands in the visible water field. It does not generate
        replacement pixels or alter animation-v1. The horizon stays protected,
        while far, middle, and foreground water now all receive readable motion.
      </p>

      <div className={styles.workspace}>
        <div className={styles.controls}>
          <h3>Water envelope</h3>
          <div className={styles.sliderList}>
            {CONTROLS.map((control) => (
              <label key={control.id} className={styles.slider}>
                <span>{control.label}</span>
                <input
                  aria-label={control.label}
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={parameters[control.id]}
                  onChange={(event) =>
                    update(control.id, Number(event.target.value))
                  }
                />
                <output>{parameters[control.id].toFixed(2)}</output>
                <small>{control.description}</small>
              </label>
            ))}
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={renderAudition} disabled={rendering}>
              {rendering ? 'Rendering water audition…' : 'Render water audition'}
            </button>
            <button type="button" onClick={reset} disabled={rendering}>
              Reset
            </button>
          </div>

          <p className={styles.note}>
            The upper water should now be visibly alive without moving the true
            horizon. The foreground remains strongest, but it should no longer be
            the only part of the shot where motion is obvious.
          </p>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className={styles.preview}>
          <LiveWaterPreview parameters={parameters} />

          {audition ? (
            <div className={styles.renderedProof}>
              <div className={styles.proofHeading}>
                <span className={styles.eyebrow}>Remotion proof</span>
                <strong>Rendered non-canonical audition</strong>
              </div>
              <div
                className={styles.renderedParameters}
                aria-label="Rendered water parameters"
              >
                {CONTROLS.map((control) => (
                  <span key={control.id}>
                    <strong>{control.label}</strong>{' '}
                    {audition.parameters[control.id].toFixed(2)}
                  </span>
                ))}
              </div>
              <video
                key={audition.id}
                controls
                autoPlay
                loop
                muted
                playsInline
                src={audition.videoUrl}
                aria-label="Shot 1 water audition video"
              />
              <div className={styles.receipt}>
                <code>{audition.videoPath}</code>
                <span>{new Date(audition.createdAt).toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className={styles.renderHint}>
              The viewport above is live. When the motion feels right, choose
              <strong> Render water audition </strong>
              to produce the deterministic Scene V2/Remotion MP4 for review.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default Shot01WaterLab;
