import { useEffect, useMemo, useState } from 'react';
import App from './app';
import styles from './forge-lab.module.css';

interface ProductionDecision {
  id: string;
  state: string;
  path: string;
  rationale: string | null;
}

interface ProductionLayer {
  id: string;
  role: string;
  material: string;
  required: boolean;
  ready: boolean;
  state: string;
  reviewStatus: string;
  motionPresets: string[];
  lane: { id: string; generatorFamily: string | null; qaFamily: string | null } | null;
}

interface ProductionShot {
  shotId: string;
  sourceShotNumber: number;
  status: string;
  activationState: 'layered-ready' | 'editorial-fallback';
  requiredLayerCount: number;
  readyRequiredLayerCount: number;
  optionalLayerCount: number;
  layers: ProductionLayer[];
  decisions: ProductionDecision[];
}

interface ProductionStatus {
  principle: string;
  observedAt: string;
  shots: ProductionShot[];
}

interface EvidenceShot {
  sourceShotNumber: number;
  available: boolean;
  videoUrl: string | null;
  contactSheetUrl: string | null;
  renderedAt: string | null;
}

interface EvidenceStatus {
  shots: EvidenceShot[];
}

interface LocalAiProviderCapability {
  id: string;
  available: boolean;
  configuredModel?: string;
  configuredVisionModel?: string;
  text: boolean;
  vision: boolean;
  structuredOutput: boolean;
  managedUnload: boolean;
  openAiCompatible: boolean;
  detail?: string;
}

type LoadState = {
  production: ProductionStatus | null;
  evidence: EvidenceStatus | null;
  providers: LocalAiProviderCapability[];
  error: string | null;
};

function initialShot(): number {
  if (typeof window === 'undefined') return 3;
  const pathMatch = window.location.pathname.match(/\/forge\/shot\/(\d+)/);
  const candidate = Number(pathMatch?.[1] ?? new URLSearchParams(window.location.search).get('shot') ?? 3);
  return candidate === 4 ? 4 : 3;
}

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return (await response.json()) as T;
}

export function ForgeLab() {
  const [shotNumber, setShotNumber] = useState(initialShot);
  const [state, setState] = useState<LoadState>({
    production: null,
    evidence: null,
    providers: [],
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      readJson<ProductionStatus>('/api/runtime/animation-production'),
      readJson<EvidenceStatus>('/api/runtime/animation-production-evidence'),
      readJson<LocalAiProviderCapability[]>('/api/local-ai/providers'),
    ])
      .then(([production, evidence, providers]) => {
        if (!cancelled) setState({ production, evidence, providers, error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            error: error instanceof Error ? error.message : String(error),
          }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const shot = useMemo(
    () => state.production?.shots.find((candidate) => candidate.sourceShotNumber === shotNumber) ?? null,
    [shotNumber, state.production],
  );
  const evidence = useMemo(
    () => state.evidence?.shots.find((candidate) => candidate.sourceShotNumber === shotNumber) ?? null,
    [shotNumber, state.evidence],
  );

  const chooseShot = (value: number) => {
    setShotNumber(value);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/forge/shot/${value}`);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.forgeHeader} aria-label="Forge Lab production context">
        <div>
          <p className={styles.eyebrow}>React Forge Lab · read-only production audition</p>
          <h1>Canonical animation workbench</h1>
          <p className={styles.principle}>
            {state.production?.principle ?? 'AI proposes. Rules constrain. Human directs.'}
          </p>
        </div>
        <div className={styles.shotPicker} role="group" aria-label="Forge shot selector">
          {[3, 4].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={shotNumber === value}
              onClick={() => chooseShot(value)}
            >
              Shot {value}
            </button>
          ))}
        </div>
      </section>

      {state.error ? (
        <section className={styles.error} role="alert">
          <strong>Production API unavailable</strong>
          <span>{state.error}</span>
          <span>The pinned deterministic Scene V3 inspector remains available below.</span>
        </section>
      ) : null}

      <section className={styles.contextGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.label}>Canonical production state</span>
              <h2>{shot ? `Shot ${shot.sourceShotNumber} · ${shot.shotId}` : `Shot ${shotNumber}`}</h2>
            </div>
            {shot ? <span className={styles.badge}>{shot.activationState}</span> : null}
          </div>
          {shot ? (
            <>
              <p>
                Required layers: {shot.readyRequiredLayerCount}/{shot.requiredLayerCount} ready · Optional: {shot.optionalLayerCount}
              </p>
              <div className={styles.layerList}>
                {shot.layers.map((layer) => (
                  <div className={styles.layerRow} key={layer.id}>
                    <div>
                      <strong>{layer.id}</strong>
                      <span>{layer.role} · {layer.material}</span>
                    </div>
                    <div className={styles.layerMeta}>
                      <span>{layer.required ? 'required' : 'optional'}</span>
                      <span>{layer.ready ? 'READY' : layer.reviewStatus.toUpperCase()}</span>
                      {layer.lane ? <code>{layer.lane.id}</code> : null}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p>Loading manifest-backed production state…</p>
          )}
        </article>

        <article className={styles.panel}>
          <span className={styles.label}>Local AI capability</span>
          <h2>Provider inventory</h2>
          {state.providers.length === 0 ? (
            <p>Loading provider capability…</p>
          ) : (
            <div className={styles.providerList}>
              {state.providers.map((provider) => (
                <div key={provider.id} className={styles.providerRow}>
                  <div>
                    <strong>{provider.id}</strong>
                    <span>{provider.available ? 'available' : 'unavailable'}</span>
                  </div>
                  <div className={styles.capabilities}>
                    {provider.text ? <span>text</span> : null}
                    {provider.vision ? <span>vision</span> : null}
                    {provider.structuredOutput ? <span>structured</span> : null}
                    {provider.managedUnload ? <span>managed unload</span> : null}
                  </div>
                  <small>{provider.detail ?? provider.configuredModel ?? 'No provider detail.'}</small>
                </div>
              ))}
            </div>
          )}
          <p className={styles.readOnlyNote}>Read-only in PR #32. No model call, proposal, save, or promotion action exists here.</p>
        </article>
      </section>

      <section className={styles.evidencePanel} aria-label={`Shot ${shotNumber} canonical benchmark evidence`}>
        <div className={styles.panelHeading}>
          <div>
            <span className={styles.label}>Canonical benchmark audition</span>
            <h2>Shot {shotNumber} rendered evidence</h2>
          </div>
          <span className={styles.badge}>{evidence?.available ? 'evidence available' : 'no benchmark evidence'}</span>
        </div>
        {evidence?.available && evidence.videoUrl ? (
          <div className={styles.evidenceGrid}>
            <video controls preload="metadata" src={evidence.videoUrl} aria-label={`Shot ${shotNumber} benchmark video`} />
            {evidence.contactSheetUrl ? (
              <img src={evidence.contactSheetUrl} alt={`Shot ${shotNumber} benchmark contact sheet`} />
            ) : null}
          </div>
        ) : (
          <p>No persisted Scene V2 benchmark video/contact sheet is currently available for this shot.</p>
        )}
      </section>

      {shotNumber === 3 ? (
        <section className={styles.inspectorSection}>
          <div className={styles.sectionIntro}>
            <span className={styles.label}>Deterministic live inspection</span>
            <h2>Shot 3 Scene V3 runtime</h2>
            <p>The existing Pixi inspection remains frame-exact and read-only. It is not a canonical-state editor.</p>
          </div>
          <App />
        </section>
      ) : (
        <section className={styles.pendingInspector}>
          <span className={styles.label}>Deterministic live inspection</span>
          <h2>Shot 4 Scene V3 runtime is not fabricated</h2>
          <p>
            Shot 4 production readiness and benchmark evidence above are canonical. A Scene V3 inspection fixture/runtime will be mounted only when that resolved contract exists; this Forge will not synthesize one merely for UI parity.
          </p>
        </section>
      )}
    </div>
  );
}

export default ForgeLab;
