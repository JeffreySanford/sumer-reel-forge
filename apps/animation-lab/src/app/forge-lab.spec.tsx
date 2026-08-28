import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ForgeLab from './forge-lab';

function jsonResponse(value: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => value,
  } as Response;
}

function productionPayload() {
  return {
    principle: 'AI proposes. Rules constrain. Human directs.',
    observedAt: '2026-08-28T00:00:00.000Z',
    shots: [
      {
        shotId: 'enki-at-the-helm',
        sourceShotNumber: 3,
        status: 'approved',
        activationState: 'layered-ready',
        requiredLayerCount: 2,
        readyRequiredLayerCount: 2,
        optionalLayerCount: 2,
        decisions: [],
        layers: [
          {
            id: 'shot03-enki-body-v1',
            role: 'character',
            material: 'cloth-heavy',
            required: true,
            ready: true,
            state: 'approved',
            reviewStatus: 'approved',
            motionPresets: ['breathing'],
            lane: {
              id: 'character-source-extraction',
              generatorFamily: 'sam3-semantic-overlay',
              qaFamily: 'identity-alpha-then-composite-motion',
            },
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
        layers: [],
      },
    ],
  };
}

function evidencePayload() {
  return {
    shots: [3, 4].map((shot) => ({
      sourceShotNumber: shot,
      available: true,
      videoUrl: `/api/runtime/animation-production/evidence/${shot}/video`,
      contactSheetUrl: `/api/runtime/animation-production/evidence/${shot}/contact-sheet`,
      renderedAt: '2026-08-28T00:00:00.000Z',
    })),
  };
}

function providerPayload() {
  return [
    {
      id: 'ollama',
      available: true,
      configuredModel: 'qwen3:8b',
      text: true,
      vision: true,
      structuredOutput: true,
      managedUnload: true,
      openAiCompatible: false,
      detail: 'Local Ollama is reachable and participates in managed GPU ownership.',
    },
  ];
}

describe('ForgeLab', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  });

  it('loads canonical production context and exposes only bounded proposal actions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.endsWith('/animation-production')) return Promise.resolve(jsonResponse(productionPayload()));
        if (url.endsWith('/animation-production-evidence')) return Promise.resolve(jsonResponse(evidencePayload()));
        if (url.endsWith('/local-ai/providers')) return Promise.resolve(jsonResponse(providerPayload()));
        throw new Error(`Unexpected URL ${url}`);
      }),
    );

    render(<ForgeLab />);

    expect(await screen.findByText('Shot 3 · enki-at-the-helm')).toBeTruthy();
    expect(screen.getByText('Required layers: 2/2 ready · Optional: 2')).toBeTruthy();
    expect(screen.getByText('character-source-extraction')).toBeTruthy();
    expect(screen.getByText('Local Ollama is reachable and participates in managed GPU ownership.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Propose with ollama' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /promote/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /approve/i })).toBeNull();
  });

  it('requests a bounded proposal and applies it only to React working state', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith('/animation-production')) return Promise.resolve(jsonResponse(productionPayload()));
      if (url.endsWith('/animation-production-evidence')) return Promise.resolve(jsonResponse(evidencePayload()));
      if (url.endsWith('/local-ai/providers')) return Promise.resolve(jsonResponse(providerPayload()));
      if (url.endsWith('/forge/motion-proposals')) {
        expect(init?.method).toBe('POST');
        expect(JSON.parse(String(init?.body))).toEqual({
          shot: 3,
          provider: 'ollama',
          model: 'qwen3:8b',
          direction: 'Make the vessel heavier.',
        });
        return Promise.resolve(jsonResponse({
          schemaVersion: 1,
          id: 'proposal-1',
          state: 'proposal',
          shot: 3,
          shotId: 'enki-at-the-helm',
          provider: 'ollama',
          model: 'qwen3:8b',
          createdAt: '2026-08-28T00:00:01.000Z',
          canonicalObservedAt: '2026-08-28T00:00:00.000Z',
          summary: 'Heavy vessel, restrained Enki.',
          parameters: [
            { id: 'vesselHeave', label: 'Vessel heave', value: 0.72, minimum: 0, maximum: 1, rationale: 'Heavy inertia.' },
            { id: 'vesselRoll', label: 'Vessel roll', value: 0.24, minimum: 0, maximum: 1, rationale: 'Small rigid roll.' },
          ],
          guardrails: ['No proposal may promote or mutate animation-v1.'],
        }));
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ForgeLab />);
    await screen.findByText('Shot 3 · enki-at-the-helm');

    fireEvent.change(screen.getByLabelText('Optional human direction'), {
      target: { value: 'Make the vessel heavier.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Propose with ollama' }));

    expect(await screen.findByText('Heavy vessel, restrained Enki.')).toBeTruthy();
    expect(screen.getByText('0.72')).toBeTruthy();
    expect(screen.queryByLabelText('React working motion state')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Apply to working state' }));

    const working = screen.getByLabelText('React working motion state');
    expect(working).toBeTruthy();
    expect(screen.getByText('React state only')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /promote/i })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('switches to Shot 4 evidence without fabricating a Scene V3 runtime', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.endsWith('/animation-production')) return Promise.resolve(jsonResponse(productionPayload()));
        if (url.endsWith('/animation-production-evidence')) return Promise.resolve(jsonResponse(evidencePayload()));
        if (url.endsWith('/local-ai/providers')) return Promise.resolve(jsonResponse(providerPayload()));
        throw new Error(`Unexpected URL ${url}`);
      }),
    );

    render(<ForgeLab />);
    fireEvent.click(screen.getByRole('button', { name: 'Shot 4' }));

    expect(await screen.findByText('Shot 4 · nammu-under-water')).toBeTruthy();
    expect(screen.getByLabelText('Shot 4 benchmark video')).toBeTruthy();
    expect(screen.getByText('Shot 4 Scene V3 runtime is not fabricated')).toBeTruthy();
    await waitFor(() => expect(window.location.pathname).toBe('/forge/shot/4'));
  });
});
