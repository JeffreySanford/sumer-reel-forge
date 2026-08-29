import { useState } from 'react';
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
    description: 'How far the water surface slides laterally. Keep this low enough that the horizon remains stable.',
  },
  {
    id: 'verticalRipple',
    label: 'Vertical ripple',
    description: 'Small up/down displacement inside the lower water field. This is the easiest control to overdo.',
  },
  {
    id: 'flowSpeed',
    label: 'Flow speed',
    description: 'Temporal speed of the current. Low values feel heavy; high values quickly become synthetic.',
  },
  {
    id: 'rippleScale',
    label: 'Ripple scale',
    description: 'Controls the number and phase spacing of feathered water bands. Higher values create tighter surface detail.',
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
        detail = Array.isArray(payload.message) ? payload.message.join('; ') : payload.message;
      }
    } catch {
      // Preserve HTTP fallback when the error body is not JSON.
    }
    throw new Error(detail);
  }
  return (await response.json()) as T;
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
        feathered horizontal bands in the lower water field. It does not generate
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
            The default envelope is intentionally readable at normal speed. The
            horizon stays restrained while deeper water carries more displacement;
            pull the controls back if the surface starts to feel synthetic.
          </p>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className={styles.preview}>
          {audition ? (
            <>
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
                <strong>Rendered non-canonical audition</strong>
                <code>{audition.videoPath}</code>
                <span>{new Date(audition.createdAt).toLocaleString()}</span>
              </div>
            </>
          ) : (
            <div className={styles.placeholder}>
              Render an audition to see the source-preserving water displacement
              here. Each render uses the same Scene V2/Remotion pipeline as the
              benchmark, not a browser-only approximation.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default Shot01WaterLab;
