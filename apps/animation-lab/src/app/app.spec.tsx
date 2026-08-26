import { fireEvent, render, screen } from '@testing-library/react';
import App from './app';

describe('Animation Lab App', () => {
  it('renders the pinned Scene V3 inspection state at BLINK_CLOSED', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Enki at the Helm' })).toBeTruthy();
    expect(screen.getByText('frame 101 / 210')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /BLINK_CLOSED frame 101/i }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.getByText('actor:enki')).toBeTruthy();
  });

  it('selects named proof states without requiring playback', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /START frame 0/i }));

    expect(screen.getByText('frame 0 / 210')).toBeTruthy();
    expect(screen.getByRole('button', { name: /START frame 0/i }).getAttribute('aria-pressed')).toBe('true');
  });

  it('supports exact-frame keyboard stepping', () => {
    render(<App />);

    const frameControl = screen.getByRole('group', { name: 'Exact frame control' });
    fireEvent.keyDown(frameControl, { key: 'ArrowRight' });

    expect(screen.getByText('frame 102 / 210')).toBeTruthy();
    expect(screen.getByText('UNNAMED FRAME')).toBeTruthy();
  });

  it('shows QA contracts as NOT_RUN rather than presumed passing', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('tab', { name: 'QA' }));

    expect(screen.getAllByText('NOT_RUN')).toHaveLength(3);
    expect(screen.getByText('QA contracts are visible, not presumed passed')).toBeTruthy();
  });
});
