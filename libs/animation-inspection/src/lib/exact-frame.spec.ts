import { describe, expect, it } from 'vitest';
import {
  applyExactFrameCommand,
  assertExactFrame,
  buildExactFrameViewModel,
  sceneFrameProgress,
} from './exact-frame';

describe('exact-frame inspection helpers', () => {
  it('accepts first and last included frame', () => {
    expect(() => assertExactFrame(0, 210)).not.toThrow();
    expect(() => assertExactFrame(209, 210)).not.toThrow();
  });

  it('rejects negative, end-exclusive and fractional frames', () => {
    expect(() => assertExactFrame(-1, 210)).toThrow(/outside/);
    expect(() => assertExactFrame(210, 210)).toThrow(/outside/);
    expect(() => assertExactFrame(1.5, 210)).toThrow(/integer/);
  });

  it('uses endpoint-aware scene progress', () => {
    expect(sceneFrameProgress(0, 210)).toBe(0);
    expect(sceneFrameProgress(209, 210)).toBe(1);
    expect(sceneFrameProgress(105, 210)).toBeCloseTo(105 / 209);
  });

  it('special-cases a one-frame scene', () => {
    expect(sceneFrameProgress(0, 1)).toBe(0);
  });

  it('steps one frame and clamps at scene bounds', () => {
    expect(applyExactFrameCommand(10, 210, 'step-back')).toBe(9);
    expect(applyExactFrameCommand(10, 210, 'step-forward')).toBe(11);
    expect(applyExactFrameCommand(0, 210, 'step-back')).toBe(0);
    expect(applyExactFrameCommand(209, 210, 'step-forward')).toBe(209);
  });

  it('supports page-sized jumps without wrapping', () => {
    expect(applyExactFrameCommand(50, 210, 'jump-back', 25)).toBe(25);
    expect(applyExactFrameCommand(50, 210, 'jump-forward', 25)).toBe(75);
    expect(applyExactFrameCommand(5, 210, 'jump-back', 25)).toBe(0);
    expect(applyExactFrameCommand(200, 210, 'jump-forward', 25)).toBe(209);
  });

  it('supports Home and End semantics', () => {
    expect(applyExactFrameCommand(101, 210, 'home')).toBe(0);
    expect(applyExactFrameCommand(101, 210, 'end')).toBe(209);
  });

  it('rejects invalid jump sizes', () => {
    expect(() => applyExactFrameCommand(10, 210, 'jump-forward', 0)).toThrow(
      /positive integer/,
    );
  });

  it('builds frame labels, time and progress from frame authority', () => {
    expect(buildExactFrameViewModel({ frame: 101, fps: 30, durationFrames: 210 })).toEqual({
      frame: 101,
      fps: 30,
      durationFrames: 210,
      timeSeconds: 101 / 30,
      progress: 101 / 209,
      label: 'frame 101 / 210',
    });
  });
});
