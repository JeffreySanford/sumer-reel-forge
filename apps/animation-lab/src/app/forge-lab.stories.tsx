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
  play: async ({ canvas }) => {
    await canvas.findByRole('heading', { name: 'Shot 3 · enki-at-the-helm' });
    await canvas.findByRole('button', { name: 'Propose with ollama' });
  },
};

export const Shot4Ready: Story = {
  render: () => <ForgeScenario scenario="shot4" />,
  play: async ({ canvas }) => {
    await canvas.findByRole('heading', { name: 'Shot 4 · nammu-under-water' });
    await canvas.findByText('Shot 4 Scene V3 runtime is not fabricated');
  },
};

export const OllamaUnavailable: Story = {
  render: () => <ForgeScenario scenario="unavailable" />,
  play: async ({ canvas }) => {
    const propose = await canvas.findByRole('button', { name: 'Propose with local AI' });
    if (!propose.hasAttribute('disabled')) {
      throw new Error('Proposal action must be disabled when no text provider is available.');
    }
  },
};

export const ProposalSuccess: Story = {
  render: () => <ForgeScenario scenario="ready" />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(
      await canvas.findByLabelText('Optional human direction'),
      'Make the vessel feel heavier without increasing character motion.',
    );
    await userEvent.click(await canvas.findByRole('button', { name: 'Propose with ollama' }));
    await canvas.findByText('Heavier vessel motion with restrained Enki compensation.');
    await userEvent.click(await canvas.findByRole('button', { name: 'Apply to working state' }));
    await canvas.findByText('React state only');
    await userEvent.click(await canvas.findByRole('button', { name: 'Reset working state' }));
  },
};

export const ProposalFailure: Story = {
  render: () => <ForgeScenario scenario="proposal-error" />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Propose with ollama' }));
    await canvas.findByRole('alert');
    await canvas.findByText('Synthetic Storybook proposal failure.');
  },
};
