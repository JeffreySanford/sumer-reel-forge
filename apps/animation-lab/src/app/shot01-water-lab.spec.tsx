import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Shot01WaterLab from './shot01-water-lab';

function jsonResponse(value: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => value,
  } as Response;
}

describe('Shot01WaterLab', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders only a non-canonical source-preserving water audition', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      expect(url).toBe('/api/forge/shot-1-water-auditions');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(String(init?.body))).toEqual({
        parameters: {
          horizontalCurrent: 0.58,
          verticalRipple: 0.38,
          flowSpeed: 0.5,
          rippleScale: 0.52,
        },
      });
      return Promise.resolve(
        jsonResponse({
          schemaVersion: 1,
          id: '11111111-1111-4111-8111-111111111111',
          state: 'rendered-non-canonical-audition',
          sourceShotNumber: 1,
          createdAt: '2026-08-28T23:00:00.000Z',
          parameters: {
            horizontalCurrent: 0.58,
            verticalRipple: 0.38,
            flowSpeed: 0.5,
            rippleScale: 0.52,
          },
          scenePath:
            'tmp/forge-water-auditions/11111111-1111-4111-8111-111111111111/shot01-water-audition.scene-v2.json',
          videoPath:
            'tmp/forge-water-auditions/11111111-1111-4111-8111-111111111111/shot1-scene-v2-benchmark.mp4',
          videoUrl:
            '/api/forge/shot-1-water-auditions/11111111-1111-4111-8111-111111111111/video',
          guardrails: [],
        }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<Shot01WaterLab />);

    expect(screen.getByText('Dedicated water-motion audition')).toBeTruthy();
    expect(screen.getByText('non-canonical')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /promote/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /approve/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Render water audition' }));

    const video = await screen.findByLabelText('Shot 1 water audition video');
    expect(video.getAttribute('src')).toContain('/api/forge/shot-1-water-auditions/');
    expect(await screen.findByText('Rendered non-canonical audition')).toBeTruthy();
    expect(screen.getByLabelText('Rendered water parameters').textContent).toContain(
      'Horizontal current 0.58',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('posts all four current slider values when Render water audition is pressed', async () => {
    const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
      Promise.resolve(
        jsonResponse({
          schemaVersion: 1,
          id: '22222222-2222-4222-8222-222222222222',
          state: 'rendered-non-canonical-audition',
          sourceShotNumber: 1,
          createdAt: '2026-08-29T06:30:00.000Z',
          parameters: JSON.parse(String(init?.body)).parameters,
          scenePath: 'tmp/forge-water-auditions/test/scene.json',
          videoPath: 'tmp/forge-water-auditions/test/video.mp4',
          videoUrl: '/api/forge/shot-1-water-auditions/test/video',
          guardrails: [],
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<Shot01WaterLab />);

    fireEvent.change(screen.getByRole('slider', { name: 'Horizontal current' }), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByRole('slider', { name: 'Vertical ripple' }), {
      target: { value: '0.76' },
    });
    fireEvent.change(screen.getByRole('slider', { name: 'Flow speed' }), {
      target: { value: '0.24' },
    });
    fireEvent.change(screen.getByRole('slider', { name: 'Ripple scale' }), {
      target: { value: '0.91' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Render water audition' }));

    await screen.findByLabelText('Shot 1 water audition video');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      parameters: {
        horizontalCurrent: 1,
        verticalRipple: 0.76,
        flowSpeed: 0.24,
        rippleScale: 0.91,
      },
    });
    expect(screen.getByLabelText('Rendered water parameters').textContent).toContain(
      'Ripple scale 0.91',
    );
  });
});
