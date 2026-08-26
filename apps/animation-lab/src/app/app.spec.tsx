import { fireEvent, render, screen } from '@testing-library/react';
import App from './app';
import type { RuntimePreviewAdapter } from './runtime-preview';

describe('Animation Lab App', () => {
  it('renders the pinned Scene V3 inspection state through the fake runtime preview', () => {
    const { container } = render(<App />);

    expect(screen.getByRole('heading', { name: 'Enki at the Helm' })).toBeTruthy();
    expect(screen.getByText('frame 101 / 210')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /BLINK_CLOSED frame 101/i }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.getByRole('img', { name: 'Fake runtime preview at frame 101' })).toBeTruthy();
    expect(screen.getByText('4 runtimes evaluated')).toBeTruthy();
    expect(
      container.querySelector('[data-runtime-node="actor-instance:enki:s03"]')?.getAttribute(
        'data-runtime-x',
      ),
    ).toBe('7.030');
  });

  it('selects named proof states and re-evaluates runtime state without playback', () => {
    const { container } = render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /START frame 0/i }));

    expect(screen.getByText('frame 0 / 210')).toBeTruthy();
    expect(screen.getByRole('button', { name: /START frame 0/i }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('img', { name: 'Fake runtime preview at frame 0' })).toBeTruthy();
    expect(
      container.querySelector('[data-runtime-node="prop:stag-of-absu"]')?.getAttribute(
        'data-runtime-x',
      ),
    ).toBe('4.000');
  });

  it('supports exact-frame keyboard stepping', () => {
    render(<App />);

    const frameControl = screen.getByRole('group', { name: 'Exact frame control' });
    fireEvent.keyDown(frameControl, { key: 'ArrowRight' });

    expect(screen.getByText('frame 102 / 210')).toBeTruthy();
    expect(screen.getByText('UNNAMED FRAME')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Fake runtime preview at frame 102' })).toBeTruthy();
  });

  it('shows QA contracts as NOT_RUN rather than presumed passing', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('tab', { name: 'QA' }));

    expect(screen.getAllByText('NOT_RUN')).toHaveLength(3);
    expect(screen.getByText('QA contracts are visible, not presumed passed')).toBeTruthy();
  });

  it('keeps inspection available when a preview adapter fails', () => {
    const failingAdapter: RuntimePreviewAdapter = {
      id: 'failing-preview@1',
      evaluate() {
        throw new Error('Synthetic preview failure.');
      },
    };

    render(<App previewAdapter={failingAdapter} />);

    expect(screen.getByRole('alert').textContent).toContain('Synthetic preview failure.');
    expect(screen.getByText('frame 101 / 210')).toBeTruthy();
    expect(screen.getByText('actor:enki')).toBeTruthy();
  });

  it('renders an explicit empty preview state without inventing geometry', () => {
    const emptyAdapter: RuntimePreviewAdapter = {
      id: 'empty-preview@1',
      evaluate({ inspection }) {
        return {
          adapterId: this.id,
          frame: inspection.exactFrame.frame,
          evaluatedRuntimeCount: 1,
          nodes: [],
        };
      },
    };

    render(<App previewAdapter={emptyAdapter} />);

    expect(screen.getByText('No drawable runtime nodes')).toBeTruthy();
    expect(screen.getByText('Frame 101 resolved successfully.')).toBeTruthy();
  });
});