import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createPixiPreviewSurface,
  PIXI_PREVIEW_RENDER_MODE,
  type PixiPreviewSurface,
} from '@sumer-reel-forge/animation-pixi';
import previewStyles from './runtime-preview-panel.module.css';
import { buildPixiPreviewPlan } from './pixi-preview-plan';
import type { RuntimePreviewModel } from './runtime-preview';

type PixiMountStatus = 'MOUNTING' | 'READY' | 'ERROR';

export function PixiRuntimeCanvas({
  model,
  width,
  height,
}: {
  readonly model: RuntimePreviewModel;
  readonly width: number;
  readonly height: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<PixiPreviewSurface | null>(null);
  const plan = useMemo(() => buildPixiPreviewPlan(model, width, height), [model, width, height]);
  const planRef = useRef(plan);
  const [status, setStatus] = useState<PixiMountStatus>('MOUNTING');
  const [error, setError] = useState<string | null>(null);
  planRef.current = plan;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      setStatus('ERROR');
      setError('Pixi preview host is unavailable.');
      return;
    }

    let disposed = false;
    let createdSurface: PixiPreviewSurface | null = null;

    setStatus('MOUNTING');
    setError(null);

    void (async () => {
      try {
        const surface = await createPixiPreviewSurface(width, height);
        createdSurface = surface;

        if (disposed) {
          surface.destroy();
          return;
        }

        host.replaceChildren(surface.canvas);
        surfaceRef.current = surface;
        surface.render(planRef.current);
        setStatus('READY');
      } catch (reason) {
        if (disposed) return;
        const message = reason instanceof Error ? reason.message : String(reason);
        setError(message);
        setStatus('ERROR');
      }
    })();

    return () => {
      disposed = true;
      if (surfaceRef.current === createdSurface) surfaceRef.current = null;
      createdSurface?.destroy();
      host.replaceChildren();
    };
  }, [width, height]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    try {
      surface.render(plan);
      setStatus('READY');
      setError(null);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      setError(message);
      setStatus('ERROR');
    }
  }, [plan]);

  return (
    <div className={previewStyles.pixiFrame}>
      <div
        ref={hostRef}
        className={previewStyles.pixiHost}
        style={{ aspectRatio: `${width} / ${height}` }}
        data-pixi-state={status}
        data-pixi-frame={plan.frame}
        data-pixi-node-count={plan.nodeCount}
        aria-label="Pixi exact-frame renderer"
      />
      <div className={previewStyles.pixiStatus} aria-live="polite">
        <strong>PIXI {status}</strong>
        <span>{PIXI_PREVIEW_RENDER_MODE}</span>
        <span>ticker stopped</span>
        {error ? <code>{error}</code> : null}
      </div>
    </div>
  );
}
