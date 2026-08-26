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

function previewY(node: RuntimePreviewNode, normalizedHeight: number): number {
  const scale = normalizedHeight / 177.778;
  if (node.kind === 'environment') return 126 * scale;
  if (node.kind === 'prop') return clamp((112 - node.y * 3) * scale, 85 * scale, 125 * scale);
  return clamp((80 - node.y * 3) * scale, 40 * scale, 105 * scale);
}

function coordinates(x: number, y: number): string {
  return `(${x.toFixed(3)}, ${y.toFixed(3)})`;
}

function shortHash(hash: string): string {
  if (hash.length <= 28) return hash;
  return `${hash.slice(0, 18)}…${hash.slice(-8)}`;
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

  const viewportWidth = model.viewport?.width ?? fixture.frame.width;
  const viewportHeight = model.viewport?.height ?? fixture.frame.height;
  const normalizedHeight = (100 * viewportHeight) / viewportWidth;
  const evidenceStatus = model.evidence?.status ?? 'BOUND';

  return (
    <section
      className={appStyles.preview}
      aria-label="Runtime preview"
      data-evidence-status={evidenceStatus}
    >
      <div className={appStyles.previewBadge}>FAKE RUNTIME PREVIEW</div>
      <div className={previewStyles.diagnosticSummary} aria-label="Preview diagnostics summary">
        <strong data-preview-evidence={evidenceStatus}>EVIDENCE {evidenceStatus}</strong>
        <span>
          {viewportWidth}×{viewportHeight}
        </span>
        <span>{model.viewport?.aspectRatioLabel ?? 'custom aspect'}</span>
        {model.evidence ? (
          <code title={model.evidence.resolvedSceneHash}>
            {shortHash(model.evidence.resolvedSceneHash)}
          </code>
        ) : null}
      </div>
      <svg
        className={previewStyles.runtimeCanvas}
        viewBox={`0 0 100 ${normalizedHeight}`}
        style={{ aspectRatio: `${viewportWidth} / ${viewportHeight}` }}
        role="img"
        aria-label={`Fake runtime preview at frame ${model.frame}`}
        data-viewport-width={viewportWidth}
        data-viewport-height={viewportHeight}
      >
        <title>{`Deterministic fake runtime preview at frame ${model.frame}`}</title>
        <rect
          className={previewStyles.cameraFrame}
          x="4"
          y="4"
          width="92"
          height={normalizedHeight - 8}
          rx="2"
        />
        {model.nodes.map((node) => {
          const x = previewX(node);
          const y = previewY(node, normalizedHeight);
          const common = {
            'data-runtime-node': node.id,
            'data-runtime-x': node.x.toFixed(3),
            'data-runtime-y': node.y.toFixed(3),
            'data-local-x': node.localX.toFixed(3),
            'data-local-y': node.localY.toFixed(3),
            'data-composed-x': node.x.toFixed(3),
            'data-composed-y': node.y.toFixed(3),
            'data-parent-id': node.parentId ?? '',
            'data-parent-chain': node.parentChain.join('>'),
            'data-capabilities': node.capabilities.join(','),
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
      <div className={previewStyles.runtimeDiagnostics}>
        <h3>Runtime node diagnostics</h3>
        <div className={previewStyles.tableScroller}>
          <table className={previewStyles.diagnosticsTable}>
            <caption className={previewStyles.srOnly}>
              Local and composed runtime transforms, parent chains, and capabilities
            </caption>
            <thead>
              <tr>
                <th scope="col">Node</th>
                <th scope="col">Local</th>
                <th scope="col">Composed</th>
                <th scope="col">Parent chain</th>
                <th scope="col">Capabilities</th>
              </tr>
            </thead>
            <tbody>
              {model.nodes.map((node) => (
                <tr key={node.id} data-diagnostic-node={node.id}>
                  <th scope="row">
                    <span>{node.label}</span>
                    <code>{node.runtimeId}</code>
                  </th>
                  <td data-local-transform={node.id}>{coordinates(node.localX, node.localY)}</td>
                  <td data-composed-transform={node.id}>{coordinates(node.x, node.y)}</td>
                  <td data-parent-chain-row={node.id}>
                    {node.parentChain.length > 0 ? node.parentChain.join(' → ') : 'root'}
                  </td>
                  <td>
                    <div className={previewStyles.capabilities}>
                      {node.capabilities.length > 0
                        ? node.capabilities.map((capability) => (
                            <code key={capability}>{capability}</code>
                          ))
                        : 'none'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {model.evidence ? (
        <p className={previewStyles.evidenceLine}>
          {model.evidence.historicalSourceCount} sources · {model.evidence.visualEvidenceCount} visual evidence ·{' '}
          {model.evidence.assetCount} assets · source {shortHash(model.evidence.sourceSceneHash)}
        </p>
      ) : null}
      <p className={previewStyles.previewDisclaimer}>
        Diagnostic geometry only. Runtime values are real; artwork and final rendering are not mounted.
      </p>
    </section>
  );
}
