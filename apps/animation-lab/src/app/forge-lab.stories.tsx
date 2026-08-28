import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ForgeLab } from './forge-lab';

type Scenario = 'ready' | 'unavailable' | 'proposal-error';

const production = {
  principle: 'AI proposes. Rules constrain. Human directs.',
  observedAt: '2026-08-28T20:00:00.000Z',
  shots: [
    {
      shotId: 'enki-at-the-helm',
      sourceShotNumber: 3,
      status: 'approved',
      activationState: 'layered-ready',
      requiredLayerCount: 4,
      readyRequiredLayerCount: 4,
      optionalLayerCount: 2,
      decisions: [],
      layers: [
        {
          id: 'shot03-vessel-v1',
          role: 'prop',
          material: 'rigid-vessel',
          required: true,
          ready: true,
          state: 'approved',
          reviewStatus: 'approved',
          motionPresets: ['heave', 'roll'],
          lane: { id: 'source-preservation', generatorFamily: 'source-preservation', qaFamily: 'identity-motion' },
        },
      ],
    },
    {
      shotId: 'nammu-under-water',
      sourceShotNumber: 4,
      status: 'approved',
      activationState: 'layered-ready',
      requiredLayerCount: 4,
      readyRequiredLayerCount: 4,
      optionalLayerCount: 2,
      decisions: [],
      layers: [
        {
          id: 'shot04-mid-current-v1',
          role: 'environment',
          material: 'underwater-current',
          required: true,
          ready: true,
          state: 'approved',
          reviewStatus: 'approved',
          motionPresets: ['contained-refraction'],
          lane: { id: 'contained-material', generatorFamily: 'comfyui', qaFamily: 'containment' },
        },
      ],
    },
  ],
};

const evidence = {
  shots: [
    { sourceShotNumber: 3, available: false, videoUrl: null, contactSheetUrl: null, renderedAt: null },
    { sourceShotNumber: 4, available: false, videoUrl: null, contactSheetUrl: null, renderedAt: null },
  ],
};

const availableProvider = {
  id: 'ollama',
  available: true,
  configuredModel: 'qwen3:8b',
  text: true,
  vision: true,
  structuredOutput: true,
  managedUnload: true,
  openAiCompatible: false,
  detail: 'Storybook managed Ollama fixture.',
};

const unavailableProvider = {
  ...availableProvider,
  available: false,
  text: false,
  vision: false,
  detail: 'Storybook fixture: Ollama unavailable.',
};

const proposal = {
  schemaVersion: 1,
  id: 'storybook-proposal-001',
  state: 'proposal',
  shot: 3,
  shotId: 'enki-at-the-helm',
  provider: 'ollama',
  model: 'qwen3:8b',
  createdAt: '2026-08-28T20:01:00.000Z',
  canonicalObservedAt: production.observedAt,
  summary: 'Heavier vessel motion with restrained Enki compensation.',
  parameters: [
    { id: 'vesselHeave', label: 'Vessel heave', value: 0.72, minimum: 0, maximum: 1, rationale: 'Preserve heavy low-frequency motion.' },
    { id: 'vesselRoll', label: 'Vessel roll', value: 0.31, minimum: 0, maximum: 1, rationale: 'Keep roll subordinate to heave.' },
    { id: 'enkiCounterSway', label: 'Enki counter-sway', value: 0.44, minimum: 0, maximum: 1, rationale: 'Small planted compensation.' },
    { id: 'cameraPush', label: 'Camera push', value: 0.22, minimum: 0, maximum: 1, rationale: 'Restrained editorial push.' },
  ],
  guardrails: [
    'Proposal is ephemeral API output; no database or filesystem write occurs.',
    'No proposal may promote or mutate animation-v1.',
  ],
};

function response(value: unknown, status = 200): Promise<Response> {
  return Promise.resolve(new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }));
}

function scenarioFetch(scenario: Scenario, fallback: typeof fetch): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.endsWith('/api/runtime/animation-production')) return response(production);
    if (url.endsWith('/api/runtime/animation-production-evidence')) return response(evidence);
    if (url.endsWith('/api/local-ai/providers')) {
      return response([scenario === 'unavailable' ? unavailableProvider : availableProvider]);
    }
    if (url.endsWith('/api/forge/motion-proposals') && init?.method === 'POST') {
      if (scenario === 'proposal-error') {
        return response({ message: 'Synthetic Storybook proposal failure.' }, 503);
      }
      return response(proposal);
    }
    return fallback(input, init);
  }) as typeof fetch;
}

function ForgeScenario({ scenario }: { readonly scenario: Scenario }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const previousFetch = globalThis.fetch;
    const mockFetch = scenarioFetch(scenario, previousFetch);
    globalThis.fetch = mockFetch;

    const history = typeof window !== 'undefined' ? window.history : null;
    const previousReplaceState = history?.replaceState;
    let scopedReplaceState: History['replaceState'] | null = null;

    if (history && previousReplaceState) {
      scopedReplaceState = function (data, unused, url) {
        const target = url == null ? '' : String(url);
        if (target.startsWith('/forge/shot/')) return;
        return previousReplaceState.call(history, data, unused, url);
      };
      history.replaceState = scopedReplaceState;
    }

    setReady(true);

    return () => {
      if (globalThis.fetch === mockFetch) {
        globalThis.fetch = previousFetch;
      }
      if (history && previousReplaceState && scopedReplaceState && history.replaceState === scopedReplaceState) {
        history.replaceState = previousReplaceState;
      }
    };
  }, [scenario]);

  return ready ? <ForgeLab /> : null;
}

async function waitForDocumentElement<T extends HTMLElement>(
  canvasElement: HTMLElement,
  label: string,
  find: (document: Document) => T | null,
): Promise<T> {
  const document = canvasElement.ownerDocument;
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const match = find(document);
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Storybook did not render ${label}.`);
}

function elementWithExactText<T extends HTMLElement>(
  document: Document,
  selector: string,
  text: string,
): T | null {
  return (
    Array.from(document.querySelectorAll<T>(selector)).find(
      (element) => element.textContent?.trim() === text,
    ) ?? null
  );
}

const meta: Meta<typeof ForgeLab> = {
  component: ForgeLab,
  title: 'Studio/Forge/ForgeLab',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ForgeLab>;

export const Shot3Ready: Story = {
  render: () => <ForgeScenario scenario="ready" />,
  play: async ({ canvasElement }) => {
    await waitForDocumentElement(canvasElement, 'Shot 3 canonical heading', (document) =>
      elementWithExactText(document, 'h2', 'Shot 3 · enki-at-the-helm'),
    );
    await waitForDocumentElement(canvasElement, 'Ollama proposal action', (document) =>
      elementWithExactText(document, 'button', 'Propose with ollama'),
    );
  },
};

export const Shot4Ready: Story = {
  render: () => <ForgeScenario scenario="ready" />,
  play: async ({ canvasElement, userEvent }) => {
    const shot4 = await waitForDocumentElement<HTMLButtonElement>(
      canvasElement,
      'Shot 4 selector',
      (document) => elementWithExactText(document, 'button', 'Shot 4'),
    );
    await userEvent.click(shot4);
    await waitForDocumentElement(canvasElement, 'Shot 4 canonical heading', (document) =>
      elementWithExactText(document, 'h2', 'Shot 4 · nammu-under-water'),
    );
    await waitForDocumentElement(canvasElement, 'Shot 4 Scene V3 guardrail', (document) =>
      elementWithExactText(document, 'h2', 'Shot 4 Scene V3 runtime is not fabricated'),
    );
  },
};

export const OllamaUnavailable: Story = {
  render: () => <ForgeScenario scenario="unavailable" />,
  play: async ({ canvasElement }) => {
    const propose = await waitForDocumentElement<HTMLButtonElement>(
      canvasElement,
      'disabled local AI proposal action',
      (document) => elementWithExactText(document, 'button', 'Propose with local AI'),
    );
    if (!propose.disabled) {
      throw new Error('Proposal action must be disabled when no text provider is available.');
    }
  },
};

export const ProposalSuccess: Story = {
  render: () => <ForgeScenario scenario="ready" />,
  play: async ({ canvasElement, userEvent }) => {
    const direction = await waitForDocumentElement<HTMLTextAreaElement>(
      canvasElement,
      'human direction field',
      (document) => document.querySelector('textarea'),
    );
    await userEvent.type(
      direction,
      'Make the vessel feel heavier without increasing character motion.',
    );
    const propose = await waitForDocumentElement<HTMLButtonElement>(
      canvasElement,
      'Ollama proposal action',
      (document) => elementWithExactText(document, 'button', 'Propose with ollama'),
    );
    await userEvent.click(propose);
    await waitForDocumentElement(canvasElement, 'proposal summary', (document) =>
      elementWithExactText(
        document,
        'strong',
        'Heavier vessel motion with restrained Enki compensation.',
      ),
    );
    const apply = await waitForDocumentElement<HTMLButtonElement>(
      canvasElement,
      'apply working state action',
      (document) => elementWithExactText(document, 'button', 'Apply to working state'),
    );
    await userEvent.click(apply);
    await waitForDocumentElement(canvasElement, 'React working state', (document) =>
      elementWithExactText(document, 'h3', 'React state only'),
    );
    const reset = await waitForDocumentElement<HTMLButtonElement>(
      canvasElement,
      'reset working state action',
      (document) => elementWithExactText(document, 'button', 'Reset working state'),
    );
    await userEvent.click(reset);
  },
};

export const ProposalFailure: Story = {
  render: () => <ForgeScenario scenario="proposal-error" />,
  play: async ({ canvasElement, userEvent }) => {
    const propose = await waitForDocumentElement<HTMLButtonElement>(
      canvasElement,
      'Ollama proposal action',
      (document) => elementWithExactText(document, 'button', 'Propose with ollama'),
    );
    await userEvent.click(propose);
    await waitForDocumentElement(canvasElement, 'proposal error alert', (document) =>
      elementWithExactText(document, '[role="alert"]', 'Synthetic Storybook proposal failure.'),
    );
  },
};
