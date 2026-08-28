import type { Meta, StoryObj } from '@storybook/react-vite';
import { ForgeLab } from './forge-lab';

type Scenario = 'ready' | 'shot4' | 'unavailable' | 'proposal-error';

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
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => value,
  } as Response);
}

function scenarioFetch(scenario: Scenario): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
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
    return response({ message: `Unhandled Storybook request ${url}` }, 404);
  }) as typeof fetch;
}

function ForgeScenario({ scenario }: { readonly scenario: Scenario }) {
  globalThis.fetch = scenarioFetch(scenario);
  if (scenario === 'shot4' && typeof window !== 'undefined') {
    window.history.replaceState(null, '', '/forge/shot/4');
  } else if (typeof window !== 'undefined') {
    window.history.replaceState(null, '', '/forge/shot/3');
  }
  return <ForgeLab />;
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
};

export const Shot4Ready: Story = {
  render: () => <ForgeScenario scenario="shot4" />,
};

export const OllamaUnavailable: Story = {
  render: () => <ForgeScenario scenario="unavailable" />,
};

export const ProposalSuccess: Story = {
  render: () => <ForgeScenario scenario="ready" />,
  parameters: {
    docs: { description: { story: 'Click Propose with ollama, then Apply to working state to exercise the bounded working envelope.' } },
  },
};

export const ProposalFailure: Story = {
  render: () => <ForgeScenario scenario="proposal-error" />,
};
