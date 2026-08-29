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
      'How far the water surface slides laterally. Keep this low enough that the horizon remains stable.',
  },
  {
    id: 'verticalRipple',
    label: 'Vertical ripple',
    description:
      'Small up/down displacement inside the lower water field. This is the easiest control to overdo.',
  },
  {
    id: 'flowSpeed',
    label: 'Flow speed',
    description:
      'Temporal speed of the current. Low values feel heavy; high values quickly become synthetic.',
  },
  {
    id: 'rippleScale',
    label: 'Ripple scale',
    description:
      'Controls the number and phase spacing of clipped water bands. Higher values create tighter surface detail.',
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

  const horizontalAmplitude = parameters.horizontalCurrent * 18;
  const verticalAmplitude = parameters.verticalRipple * 6;
  const cyclesPerSecond = 0.1 + parameters.flowSpeed * 0.3;
  const bandCount = Math.round(5 + parameters.rippleScale * 8);
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
              const bottom = Math.min(100, top + bandHeight + 1.1);
              const feather = Math.min(
                3.4,
                Math.max(1.2, bandHeight * 0.46),
              );
              const normalizedDepth =
                bandCount <= 1 ? 1 : index / (bandCount - 1);
              const depthResponse = 0.48 + normalizedDepth * 0.72;
              const phase =
                index * (0.52 + parameters.rippleScale * 0.5);
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
                  Math.sin(secondary) * horizontalAmplitude * 0.34 +
                  Math.sin(tertiary) * horizontalAmplitude * 0.12) *
                depthResponse;
              const y =
                (Math.cos(primary * 0.71) * verticalAmplitude +
                  Math.sin(secondary * 0.83) * verticalAmplitude * 0.22) *
                (0.42 + normalizedDepth * 0.58);
              const scale = 1.012 + parameters.horizontalCurrent * 0.008;
              const clipTop = Math.max(0, top - feather);
              const clipBottom = Math.min(100, bottom + feather);
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
                    opacity: 0.99,
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
        Instant browser feedback uses the same water-band envelope as the Remotion
        runtime. It is for tuning only; the rendered MP4 below remains the review
        evidence.
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
    setAudition(null);
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
        clipped horizontal bands in the lower water field. It does not generate
        replacement pixels or alter animation-v1. The existing mist and dawn-light
        treatment remain in the candidate so we can judge whether real surface
        movement improves the shot.
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
            For a sanity check, drag Horizontal current all the way from 0.00 to
            1.00. The telemetry and foreground water should both change
            immediately. Then tune back toward a restrained cinematic value.
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
