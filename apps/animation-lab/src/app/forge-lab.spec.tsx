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

describe('ForgeLab', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  });

  it('loads canonical production context and local AI capability without write actions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.endsWith('/animation-production')) {
          return Promise.resolve(
            jsonResponse({
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
                      lane: { id: 'character-source-extraction', generatorFamily: 'sam3-semantic-overlay', qaFamily: 'identity-alpha-then-composite-motion' },
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
            }),
          );
        }
        if (url.endsWith('/animation-production-evidence')) {
          return Promise.resolve(
            jsonResponse({
              shots: [
                {
                  sourceShotNumber: 3,
                  available: true,
                  videoUrl: '/api/runtime/animation-production/evidence/3/video',
                  contactSheetUrl: '/api/runtime/animation-production/evidence/3/contact-sheet',
                  renderedAt: '2026-08-28T00:00:00.000Z',
                },
                {
                  sourceShotNumber: 4,
                  available: true,
                  videoUrl: '/api/runtime/animation-production/evidence/4/video',
                  contactSheetUrl: '/api/runtime/animation-production/evidence/4/contact-sheet',
                  renderedAt: '2026-08-28T00:00:00.000Z',
                },
              ],
            }),
          );
        }
        if (url.endsWith('/local-ai/providers')) {
          return Promise.resolve(
            jsonResponse([
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
            ]),
          );
        }
        throw new Error(`Unexpected URL ${url}`);
      }),
    );

    render(<ForgeLab />);

    expect(await screen.findByText('Shot 3 · enki-at-the-helm')).toBeTruthy();
    expect(screen.getByText('Required layers: 2/2 ready · Optional: 2')).toBeTruthy();
    expect(screen.getByText('character-source-extraction')).toBeTruthy();
    expect(screen.getByText('Local Ollama is reachable and participates in managed GPU ownership.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /propose/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /promote/i })).toBeNull();
  });

  it('switches to Shot 4 evidence without fabricating a Scene V3 runtime', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.endsWith('/animation-production')) {
          return Promise.resolve(jsonResponse({
            principle: 'AI proposes. Rules constrain. Human directs.',
            observedAt: '2026-08-28T00:00:00.000Z',
            shots: [{
              shotId: 'nammu-under-water',
              sourceShotNumber: 4,
              status: 'approved',
              activationState: 'layered-ready',
              requiredLayerCount: 4,
              readyRequiredLayerCount: 4,
              optionalLayerCount: 2,
              decisions: [],
              layers: [],
            }],
          }));
        }
        if (url.endsWith('/animation-production-evidence')) {
          return Promise.resolve(jsonResponse({ shots: [{
            sourceShotNumber: 4,
            available: true,
            videoUrl: '/api/runtime/animation-production/evidence/4/video',
            contactSheetUrl: '/api/runtime/animation-production/evidence/4/contact-sheet',
            renderedAt: '2026-08-28T00:00:00.000Z',
          }] }));
        }
        return Promise.resolve(jsonResponse([]));
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
