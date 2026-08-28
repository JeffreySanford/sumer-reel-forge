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

interface ForgeMotionParameter {
  id: string;
  label: string;
  value: number;
  minimum: 0;
  maximum: 1;
  rationale: string;
}

interface ForgeMotionProposal {
  schemaVersion: 1;
  id: string;
  state: 'proposal';
  shot: 3 | 4;
  shotId: string;
  provider: string;
  model: string;
  createdAt: string;
  canonicalObservedAt: string;
  canonicalFingerprint: string;
  summary: string;
  parameters: ForgeMotionParameter[];
  guardrails: string[];
}

interface AcceptedForgeMotionProposal {
  schemaVersion: 1;
  id: string;
  state: 'accepted-for-review';
  acceptedAt: string;
  evidencePath: string;
  review: {
    deterministicQa: 'pending';
    humanReview: 'required';
    promotion: 'not-requested';
  };
}

type WorkingMotionState = Record<string, number>;

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
      // Preserve the HTTP status fallback when the body is not JSON.
    }
    throw new Error(detail);
  }
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
  const [direction, setDirection] = useState('');
  const [proposal, setProposal] = useState<ForgeMotionProposal | null>(null);
  const [workingMotion, setWorkingMotion] = useState<WorkingMotionState | null>(null);
  const [proposing, setProposing] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptance, setAcceptance] = useState<AcceptedForgeMotionProposal | null>(null);
  const [acceptanceError, setAcceptanceError] = useState<string | null>(null);

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
  const proposalProvider = useMemo(
    () => state.providers.find(
      (provider) => provider.available && provider.text && provider.structuredOutput,
    ) ?? null,
    [state.providers],
  );

  const clearAcceptance = () => {
    setAcceptance(null);
    setAcceptanceError(null);
  };

  const chooseShot = (value: number) => {
    setShotNumber(value);
    setProposal(null);
    setWorkingMotion(null);
    setProposalError(null);
    clearAcceptance();
    setDirection('');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/forge/shot/${value}`);
    }
  };

  const requestProposal = async () => {
    if (!proposalProvider || (shotNumber !== 3 && shotNumber !== 4)) return;
    setProposing(true);
    setProposalError(null);
    clearAcceptance();
    try {
      const result = await postJson<ForgeMotionProposal>('/api/forge/motion-proposals', {
        shot: shotNumber,
        provider: proposalProvider.id,
        ...(proposalProvider.configuredModel ? { model: proposalProvider.configuredModel } : {}),
        ...(direction.trim() ? { direction: direction.trim() } : {}),
      });
      setProposal(result);
      setWorkingMotion(null);
    } catch (error) {
      setProposalError(error instanceof Error ? error.message : String(error));
    } finally {
      setProposing(false);
    }
  };

  const applyProposal = () => {
    if (!proposal) return;
    clearAcceptance();
    setWorkingMotion(
      Object.fromEntries(proposal.parameters.map((parameter) => [parameter.id, parameter.value])),
    );
  };

  const updateWorkingParameter = (id: string, value: number) => {
    clearAcceptance();
    setWorkingMotion((current) => ({ ...(current ?? {}), [id]: value }));
  };

  const resetWorkingState = () => {
    clearAcceptance();
    setWorkingMotion(null);
  };

  const acceptForReview = async () => {
    if (!proposal || !workingMotion) return;
    setAccepting(true);
    setAcceptanceError(null);
    try {
      const result = await postJson<AcceptedForgeMotionProposal>(
        '/api/forge/motion-proposals/accept-for-review',
        {
          proposal,
          workingParameters: workingMotion,
          ...(direction.trim() ? { direction: direction.trim() } : {}),
        },
      );
      setAcceptance(result);
    } catch (error) {
      setAcceptance(null);
      setAcceptanceError(error instanceof Error ? error.message : String(error));
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.forgeHeader} aria-label="Forge Lab production context">
        <div>
          <p className={styles.eyebrow}>React Forge Lab · bounded local-AI audition</p>
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
          <p className={styles.readOnlyNote}>Provider calls remain API-mediated. The browser never talks to Ollama directly.</p>
        </article>
      </section>

      <section className={styles.proposalPanel} aria-label={`Shot ${shotNumber} local AI motion proposal`}>
        <div className={styles.panelHeading}>
          <div>
            <span className={styles.label}>Local AI motion advisor</span>
            <h2>Bounded Shot {shotNumber} proposal</h2>
          </div>
          <span className={styles.badge}>{proposalProvider ? `${proposalProvider.id} ready` : 'no text provider'}</span>
        </div>
        <p className={styles.proposalIntro}>
          The API supplies the canonical shot context and a server-side motion-channel allowlist. Returned values are clamped to 0–1. Proposal generation and working-state edits remain ephemeral until you explicitly accept the current working state for review; acceptance persists only non-canonical evidence under tmp/forge-proposals/ and never promotes it.
        </p>
        <label className={styles.directionField}>
          <span>Optional human direction</span>
          <textarea
            value={direction}
            maxLength={1200}
            onChange={(event) => {
              clearAcceptance();
              setDirection(event.target.value);
            }}
            placeholder={shotNumber === 3
              ? 'Example: Make the vessel feel heavier without increasing character motion.'
              : 'Example: Keep Nammu nearly static; emphasize subtle water coherence.'}
          />
        </label>
        <div className={styles.proposalActions}>
          <button
            type="button"
            onClick={requestProposal}
            disabled={!proposalProvider || proposing}
          >
            {proposing ? 'Proposing…' : `Propose with ${proposalProvider?.id ?? 'local AI'}`}
          </button>
          {proposal ? (
            <button type="button" onClick={applyProposal}>Apply to working state</button>
          ) : null}
          {workingMotion ? (
            <button type="button" onClick={resetWorkingState}>Reset working state</button>
          ) : null}
          {workingMotion && proposal ? (
            <button type="button" onClick={acceptForReview} disabled={accepting}>
              {accepting ? 'Saving for review…' : 'Accept for review'}
            </button>
          ) : null}
        </div>
        {proposalError ? <p className={styles.proposalError} role="alert">{proposalError}</p> : null}
        {acceptanceError ? <p className={styles.proposalError} role="alert">{acceptanceError}</p> : null}

        {proposal ? (
          <div className={styles.proposalResult}>
            <div className={styles.proposalSummary}>
              <strong>{proposal.summary}</strong>
              <span>{proposal.provider} · {proposal.model}</span>
              <code>{proposal.id}</code>
            </div>
            <div className={styles.parameterGrid}>
              {proposal.parameters.map((parameter) => (
                <article key={parameter.id} className={styles.parameterCard}>
                  <div>
                    <strong>{parameter.label}</strong>
                    <span>{parameter.value.toFixed(2)}</span>
                  </div>
                  <code>{parameter.id}</code>
                  <p>{parameter.rationale}</p>
                </article>
              ))}
            </div>
            <ul className={styles.guardrails}>
              {proposal.guardrails.map((guardrail) => <li key={guardrail}>{guardrail}</li>)}
            </ul>
          </div>
        ) : null}

        {workingMotion && proposal ? (
          <div className={styles.workingState} aria-label="React working motion state">
            <div>
              <span className={styles.label}>Working preview envelope</span>
              <h3>React state only</h3>
              <p>These sliders do not alter the manifest, production assets, approvals, or canonical runtime. Accept for review writes only a non-canonical evidence record; deterministic QA and human review remain required.</p>
            </div>
            <div className={styles.workingParameters}>
              {proposal.parameters.map((parameter) => (
                <label key={parameter.id}>
                  <span>{parameter.label}</span>
                  <input
                    type="range"
                    min={parameter.minimum}
                    max={parameter.maximum}
                    step={0.01}
                    value={workingMotion[parameter.id] ?? parameter.value}
                    onChange={(event) => updateWorkingParameter(parameter.id, Number(event.target.value))}
                  />
                  <output>{(workingMotion[parameter.id] ?? parameter.value).toFixed(2)}</output>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {acceptance ? (
          <div className={styles.proposalResult} role="status">
            <div className={styles.proposalSummary}>
              <strong>Saved as non-canonical review evidence</strong>
              <span>QA pending · human review required · promotion not requested</span>
              <code>{acceptance.evidencePath}</code>
            </div>
          </div>
        ) : null}
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
            <p>The existing Pixi inspection remains frame-exact and read-only. AI working values above are intentionally not bound into canonical runtime evaluation yet.</p>
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
