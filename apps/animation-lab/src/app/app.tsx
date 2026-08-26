import { useMemo, useState, type KeyboardEvent } from 'react';
import {
  applyExactFrameCommand,
  buildSceneInspection,
  type ExactFrameCommand,
  type ResolvedSceneInspectionInput,
} from '@sumer-reel-forge/animation-inspection';
import styles from './app.module.css';
import { GOLDEN_INSPECTION_FIXTURE } from './golden-inspection.fixture';

type InspectorTab =
  | 'Properties'
  | 'Provenance'
  | 'QA'
  | 'Diagnostics'
  | 'Evidence';

const FRAME_KEY_COMMANDS: Partial<Record<string, ExactFrameCommand>> = {
  ArrowLeft: 'step-back',
  ArrowRight: 'step-forward',
  PageUp: 'jump-back',
  PageDown: 'jump-forward',
  Home: 'home',
  End: 'end',
};

const INSPECTOR_TABS: readonly InspectorTab[] = [
  'Properties',
  'Provenance',
  'QA',
  'Diagnostics',
  'Evidence',
];

export interface AppProps {
  readonly fixture?: ResolvedSceneInspectionInput;
  readonly initialFrame?: number;
}

function shortHash(value: string): string {
  return value.length > 22 ? `${value.slice(0, 18)}…${value.slice(-8)}` : value;
}

function InspectorContent({
  tab,
  inspection,
}: {
  readonly tab: InspectorTab;
  readonly inspection: ReturnType<typeof buildSceneInspection>;
}) {
  if (tab === 'Properties') {
    return (
      <dl className={styles.definitionList}>
        <div><dt>Frame</dt><dd>{inspection.exactFrame.frame}</dd></div>
        <div><dt>Time</dt><dd>{inspection.exactFrame.timeSeconds.toFixed(3)} s</dd></div>
        <div><dt>Progress</dt><dd>{(inspection.exactFrame.progress * 100).toFixed(1)}%</dd></div>
        <div><dt>Canvas</dt><dd>{inspection.header.frameSize}</dd></div>
        <div><dt>FPS</dt><dd>{inspection.header.fps}</dd></div>
      </dl>
    );
  }

  if (tab === 'Provenance') {
    return (
      <div className={styles.stack}>
        {inspection.historicalSources.map((source) => (
          <article className={styles.card} key={source.id}>
            <strong>{source.id}</strong>
            <span>Revision {source.recordRevision}</span>
            <code>{shortHash(source.recordHash)}</code>
            <span>Adaptation: {source.adaptation ?? 'not classified in receipt'}</span>
            <span>Confidence: {source.confidence ?? 'not classified in receipt'}</span>
          </article>
        ))}
      </div>
    );
  }

  if (tab === 'QA') {
    return (
      <div className={styles.stack}>
        {inspection.qaGates.map((gate) => (
          <article className={styles.card} key={gate.id}>
            <div className={styles.cardHeading}>
              <strong>{gate.id}</strong>
              <span className={styles.status}>{gate.status}</span>
            </div>
            <span>{gate.category}</span>
            <p>{gate.description}</p>
            <span>{gate.blocking ? 'Blocking invariant' : 'Advisory invariant'}</span>
          </article>
        ))}
      </div>
    );
  }

  if (tab === 'Evidence') {
    return (
      <div className={styles.stack}>
        {inspection.visualEvidence.map((evidence) => (
          <article className={styles.card} key={evidence.id}>
            <strong>{evidence.id}</strong>
            <span>Revision {evidence.recordRevision}</span>
            <span>Rights: {evidence.rightsMode ?? 'unspecified'}</span>
            <code>{shortHash(evidence.recordHash)}</code>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.stack}>
      <article className={styles.card}>
        <strong>Resolved identity</strong>
        <code>{inspection.diagnostics.sourceSceneHash}</code>
        <code>{inspection.diagnostics.resolvedSceneHash}</code>
      </article>
      {inspection.diagnostics.runtimes.map((runtime) => (
        <article className={styles.card} key={runtime.id}>
          <strong>{runtime.id}</strong>
          <span>{runtime.runtime}@{runtime.version}</span>
          <span>Adapter {runtime.adapterVersion}</span>
          <code>{runtime.definitionId}</code>
        </article>
      ))}
      {inspection.diagnostics.assets.map((asset) => (
        <article className={styles.card} key={asset.id}>
          <strong>{asset.id}</strong>
          <span>{asset.logicalPath}</span>
          <code>{shortHash(asset.contentHash)}</code>
        </article>
      ))}
      {inspection.diagnostics.semanticSeeds.map((seed) => (
        <article className={styles.card} key={`${seed.targetId}:${seed.channel}:${seed.purpose}`}>
          <strong>{seed.targetId}</strong>
          <span>{seed.channel} / {seed.purpose}</span>
          <code>{seed.value}</code>
        </article>
      ))}
    </div>
  );
}

export function App({
  fixture = GOLDEN_INSPECTION_FIXTURE,
  initialFrame = 101,
}: AppProps) {
  const [frame, setFrame] = useState(initialFrame);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('Provenance');
  const inspection = useMemo(
    () => buildSceneInspection(fixture, frame),
    [fixture, frame],
  );
  const activeProof = inspection.proofStates.find((state) => state.active);

  const applyCommand = (command: ExactFrameCommand) => {
    setFrame((current) =>
      applyExactFrameCommand(
        current,
        inspection.header.durationFrames,
        command,
        10,
      ),
    );
  };

  const handleFrameKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    const command = FRAME_KEY_COMMANDS[event.key];
    if (!command) return;
    event.preventDefault();
    applyCommand(command);
  };

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Animation Lab · deterministic inspection</p>
          <h1>Enki at the Helm</h1>
          <p className={styles.sceneId}>{inspection.header.sceneId}</p>
        </div>
        <div className={styles.headerBadges} aria-label="Scene status">
          <span>Scene V3 rev {inspection.header.revision}</span>
          <span>{inspection.header.frameSize}</span>
          <span>{inspection.header.fps} fps</span>
          <span>Human review: {inspection.header.humanReview}</span>
        </div>
      </header>

      <section className={styles.workspace}>
        <aside className={styles.hierarchy} aria-label="Scene hierarchy">
          <h2>Hierarchy</h2>
          {inspection.hierarchy.map((group) => (
            <section className={styles.hierarchyGroup} key={group.id}>
              <h3>{group.label}</h3>
              {group.nodes.length === 0 ? (
                <span className={styles.muted}>None</span>
              ) : (
                <ul>
                  {group.nodes.map((node) => (
                    <li key={node.id}>
                      <span>{node.label}</span>
                      {node.runtimeId ? <code>{node.runtimeId}</code> : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </aside>

        <section className={styles.previewColumn}>
          <section className={styles.preview} aria-label="Inspection preview">
            <div className={styles.previewBadge}>INSPECTION ONLY</div>
            <div className={styles.frameNumber}>{inspection.exactFrame.frame}</div>
            <strong>{activeProof?.id ?? 'UNNAMED FRAME'}</strong>
            <p>No visual runtime is mounted in this foundation slice.</p>
            <p>Resolved scene state remains the authority.</p>
          </section>

          <section
            className={styles.frameControl}
            aria-label="Exact frame control"
            role="group"
            tabIndex={0}
            onKeyDown={handleFrameKeys}
          >
            <div className={styles.frameReadout} aria-live="polite">
              <strong>{inspection.exactFrame.label}</strong>
              <span>{inspection.exactFrame.timeSeconds.toFixed(3)} s</span>
            </div>
            <div className={styles.frameButtons}>
              <button type="button" onClick={() => applyCommand('home')}>First</button>
              <button type="button" onClick={() => applyCommand('step-back')} aria-label="Previous frame">−1</button>
              <button type="button" onClick={() => applyCommand('step-forward')} aria-label="Next frame">+1</button>
              <button type="button" onClick={() => applyCommand('end')}>Last</button>
            </div>
            <p className={styles.keyboardHint}>Keyboard: ←/→ one frame · PageUp/PageDown ten frames · Home/End bounds</p>
          </section>

          <nav className={styles.proofStates} aria-label="Named proof states">
            {inspection.proofStates.map((proof) => (
              <button
                key={proof.id}
                type="button"
                aria-label={`${proof.id} frame ${proof.frame}`}
                aria-pressed={proof.active}
                onClick={() => setFrame(proof.frame)}
              >
                <span>{proof.id}</span>
                <small>frame {proof.frame}</small>
              </button>
            ))}
          </nav>
        </section>

        <aside className={styles.inspector} aria-label="Scene inspector">
          <h2>Inspector</h2>
          <div className={styles.tabs} role="tablist" aria-label="Inspector sections">
            {INSPECTOR_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={inspectorTab === tab}
                onClick={() => setInspectorTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <section className={styles.inspectorContent} role="tabpanel" aria-label={`${inspectorTab} inspector`}>
            <InspectorContent tab={inspectorTab} inspection={inspection} />
          </section>
        </aside>
      </section>

      <footer className={styles.footer}>
        <span>{inspection.header.sourceCount} literary sources</span>
        <span>{inspection.header.visualEvidenceCount} visual evidence record</span>
        <span>{inspection.header.runtimeCount} resolved runtimes</span>
        <span>QA contracts are visible, not presumed passed</span>
      </footer>
    </main>
  );
}

export default App;
