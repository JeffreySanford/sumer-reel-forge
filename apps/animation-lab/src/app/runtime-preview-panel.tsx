import { useMemo } from 'react';
import type {
  ResolvedSceneInspectionInput,
  SceneInspectionViewModel,
} from '@sumer-reel-forge/animation-inspection';
import appStyles from './app.module.css';
import previewStyles from './runtime-preview-panel.module.css';
import type { RuntimePreviewAdapter, RuntimePreviewNode } from './runtime-preview';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function previewX(node: RuntimePreviewNode): number {
  return clamp(12 + node.x * 7, 8, 92);
}

function previewY(node: RuntimePreviewNode): number {
  if (node.kind === 'environment') return 126;
  if (node.kind === 'prop') return clamp(112 - node.y * 3, 85, 125);
  return clamp(80 - node.y * 3, 40, 105);
}

export function RuntimePreviewPanel({
  fixture,
  inspection,
  adapter,
}: {
  readonly fixture: ResolvedSceneInspectionInput;
  readonly inspection: SceneInspectionViewModel;
  readonly adapter: RuntimePreviewAdapter;
}) {
  const result = useMemo(() => {
    try {
      return { model: adapter.evaluate({ fixture, inspection }), error: null };
    } catch (reason) {
      return {
        model: null,
        error: reason instanceof Error ? reason.message : String(reason),
      };
    }
  }, [adapter, fixture, inspection]);

  if (result.error) {
    return (
      <section className={appStyles.preview} aria-label="Runtime preview">
        <div className={appStyles.previewBadge}>RUNTIME PREVIEW ERROR</div>
        <div className={previewStyles.previewState} role="alert">
          <strong>Preview unavailable</strong>
          <p>{result.error}</p>
          <p>Resolved scene state remains available for inspection.</p>
        </div>
      </section>
    );
  }

  const model = result.model;
  if (!model || model.nodes.length === 0) {
    return (
      <section className={appStyles.preview} aria-label="Runtime preview">
        <div className={appStyles.previewBadge}>FAKE RUNTIME PREVIEW</div>
        <div className={previewStyles.previewState}>
          <strong>No drawable runtime nodes</strong>
          <p>Frame {inspection.exactFrame.frame} resolved successfully.</p>
          <p>The camera may still be evaluated even when the diagnostic viewport is empty.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={appStyles.preview} aria-label="Runtime preview">
      <div className={appStyles.previewBadge}>FAKE RUNTIME PREVIEW</div>
      <svg
        className={previewStyles.runtimeCanvas}
        viewBox="0 0 100 177.778"
        role="img"
        aria-label={`Fake runtime preview at frame ${model.frame}`}
      >
        <title>{`Deterministic fake runtime preview at frame ${model.frame}`}</title>
        <rect className={previewStyles.cameraFrame} x="4" y="4" width="92" height="169.778" rx="2" />
        {model.nodes.map((node) => {
          const x = previewX(node);
          const y = previewY(node);
          const common = {
            'data-runtime-node': node.id,
            'data-runtime-x': node.x.toFixed(3),
            'data-runtime-y': node.y.toFixed(3),
            opacity: node.opacity,
          };

          if (node.kind === 'environment') {
            return (
              <g key={node.id} {...common}>
                <title>{`${node.label} · ${node.runtimeId}`}</title>
                <rect className={previewStyles.environmentShape} x="6" y={y} width="88" height="44" rx="3" />
                <path className={previewStyles.environmentLine} d={`M8 ${y + 8} C 28 ${y + 2}, 48 ${y + 14}, 92 ${y + 7}`} />
              </g>
            );
          }

          if (node.kind === 'prop') {
            return (
              <g key={node.id} {...common} transform={`translate(${x} ${y})`}>
                <title>{`${node.label} · ${node.runtimeId}`}</title>
                <rect className={previewStyles.propShape} x="-12" y="-4" width="24" height="8" rx="3" />
                <line className={previewStyles.propAxis} x1="-15" y1="6" x2="15" y2="6" />
              </g>
            );
          }

          return (
            <g key={node.id} {...common} transform={`translate(${x} ${y})`}>
              <title>{`${node.label} · ${node.runtimeId}`}</title>
              <circle className={previewStyles.actorShape} r="4.5" />
              <line className={previewStyles.actorAxis} x1="0" y1="5" x2="0" y2="14" />
              {node.proofState ? <circle className={previewStyles.proofPulse} r="8" /> : null}
            </g>
          );
        })}
      </svg>
      <div className={previewStyles.previewMeta} aria-live="polite">
        <strong>{model.proofState ?? 'UNNAMED FRAME'}</strong>
        <span>frame {model.frame}</span>
        <span>{model.evaluatedRuntimeCount} runtimes evaluated</span>
        <code>{model.adapterId}</code>
      </div>
      <p className={previewStyles.previewDisclaimer}>
        Diagnostic geometry only. Runtime values are real; artwork and final rendering are not mounted.
      </p>
    </section>
  );
}
