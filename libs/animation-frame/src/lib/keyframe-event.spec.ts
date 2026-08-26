import { createEventSchedule } from './event-schedule';
import { evaluateEasing, EASING_IDS } from './easing';
import {
  evaluateNumericKeyframes,
  validateKeyframes,
} from './keyframe';

describe('easing, keyframes and event schedules', () => {
  it('keeps every easing endpoint pinned to zero and one', () => {
    for (const id of EASING_IDS) {
      expect(evaluateEasing(id, 0)).toBe(0);
      expect(evaluateEasing(id, 1)).toBe(1);
    }
  });

  it('clamps easing input outside the normalized range', () => {
    expect(evaluateEasing('linear', -5)).toBe(0);
    expect(evaluateEasing('linear', 8)).toBe(1);
  });

  it('interpolates numeric keyframes using the outgoing easing', () => {
    const track = [
      { frame: 0, value: 0, easing: 'ease-in-quad' as const },
      { frame: 10, value: 100 },
    ];
    expect(evaluateNumericKeyframes(track, 5)).toBe(25);
  });

  it('returns exact endpoint values outside the authored keyframe span', () => {
    const track = [
      { frame: 3, value: 10 },
      { frame: 8, value: 20 },
    ];
    expect(evaluateNumericKeyframes(track, 0)).toBe(10);
    expect(evaluateNumericKeyframes(track, 99)).toBe(20);
  });

  it('rejects empty or non-increasing keyframes', () => {
    expect(() => validateKeyframes([])).toThrow(RangeError);
    expect(() =>
      validateKeyframes([
        { frame: 2, value: 1 },
        { frame: 2, value: 2 },
      ]),
    ).toThrow(RangeError);
  });

  it('sorts events by frame while preserving authored order on ties', () => {
    const schedule = createEventSchedule(
      [
        { id: 'event:later', frame: 8, payload: 'later' },
        { id: 'event:first-tie', frame: 3, payload: 'first' },
        { id: 'event:second-tie', frame: 3, payload: 'second' },
      ],
      10,
    );

    expect(schedule.events.map((event) => event.id)).toEqual([
      'event:first-tie',
      'event:second-tie',
      'event:later',
    ]);
    expect(schedule.eventsAtFrame(3).map((event) => event.id)).toEqual([
      'event:first-tie',
      'event:second-tie',
    ]);
  });

  it('uses half-open ranges for scheduled event queries', () => {
    const schedule = createEventSchedule([
      { id: 'event:a', frame: 2, payload: null },
      { id: 'event:b', frame: 4, payload: null },
      { id: 'event:c', frame: 5, payload: null },
    ]);
    expect(schedule.eventsInRange(2, 5).map((event) => event.id)).toEqual([
      'event:a',
      'event:b',
    ]);
  });

  it('rejects duplicate ids and events outside a declared scene duration', () => {
    expect(() =>
      createEventSchedule([
        { id: 'event:dup', frame: 1, payload: null },
        { id: 'event:dup', frame: 2, payload: null },
      ]),
    ).toThrow(RangeError);
    expect(() =>
      createEventSchedule([{ id: 'event:late', frame: 10, payload: null }], 10),
    ).toThrow(RangeError);
  });
});
