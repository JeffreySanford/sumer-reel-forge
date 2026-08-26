import {
  createFrameContext,
  frameToSeconds,
  sceneProgress,
} from './frame-context';
import {
  assertValidInterval,
  clampFrameToInterval,
  containsFrame,
  intervalProgress,
} from './interval';

 describe('FrameContext and frame math', () => {
  it('derives time and endpoint-aware progress from integer frame authority', () => {
    expect(
      createFrameContext({
        frame: 29,
        fps: 30,
        durationFrames: 30,
        sceneId: 'scene:test:frame',
        sceneSeed: 42,
        mode: 'qa',
      }),
    ).toEqual({
      frame: 29,
      fps: 30,
      durationFrames: 30,
      timeSeconds: 29 / 30,
      progress: 1,
      sceneId: 'scene:test:frame',
      sceneSeed: 42,
      mode: 'qa',
    });
  });

  it('uses progress zero for a one-frame scene', () => {
    expect(sceneProgress(0, 1)).toBe(0);
  });

  it('supports fractional fps without persisting floating-point time', () => {
    expect(frameToSeconds(24, 23.976)).toBeCloseTo(1.001001001, 9);
  });

  it('rejects invalid frames, durations, fps and seeds', () => {
    expect(() => sceneProgress(-1, 30)).toThrow(RangeError);
    expect(() => sceneProgress(30, 30)).toThrow(RangeError);
    expect(() => frameToSeconds(0, 0)).toThrow(RangeError);
    expect(() =>
      createFrameContext({
        frame: 0,
        fps: 30,
        durationFrames: 30,
        sceneId: 'scene:test:frame',
        sceneSeed: 1.5,
        mode: 'render',
      }),
    ).toThrow(TypeError);
  });

  it('treats intervals as half-open [startFrame, endFrame)', () => {
    const interval = { startFrame: 10, endFrame: 13 };
    expect(containsFrame(interval, 10)).toBe(true);
    expect(containsFrame(interval, 12)).toBe(true);
    expect(containsFrame(interval, 13)).toBe(false);
  });

  it('derives interval progress against the last included frame', () => {
    const interval = { startFrame: 10, endFrame: 13 };
    expect(intervalProgress(interval, 10)).toBe(0);
    expect(intervalProgress(interval, 11)).toBe(0.5);
    expect(intervalProgress(interval, 12)).toBe(1);
    expect(intervalProgress(interval, 50)).toBe(1);
  });

  it('clamps frames into valid interval bounds', () => {
    const interval = { startFrame: 10, endFrame: 13 };
    expect(clampFrameToInterval(interval, 2)).toBe(10);
    expect(clampFrameToInterval(interval, 99)).toBe(12);
  });

  it('rejects malformed intervals', () => {
    expect(() => assertValidInterval({ startFrame: 4, endFrame: 4 })).toThrow(
      RangeError,
    );
    expect(() => assertValidInterval({ startFrame: 1.5, endFrame: 4 })).toThrow(
      RangeError,
    );
  });
});
