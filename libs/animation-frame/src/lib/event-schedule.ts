export interface ScheduledFrameEvent<T = unknown> {
  readonly id: string;
  readonly frame: number;
  readonly payload: T;
}

export interface EventSchedule<T = unknown> {
  readonly events: readonly ScheduledFrameEvent<T>[];
  eventsAtFrame(frame: number): readonly ScheduledFrameEvent<T>[];
  eventsInRange(startFrame: number, endFrame: number): readonly ScheduledFrameEvent<T>[];
}

export function createEventSchedule<T>(
  input: readonly ScheduledFrameEvent<T>[],
  durationFrames?: number,
): EventSchedule<T> {
  if (
    durationFrames !== undefined &&
    (!Number.isInteger(durationFrames) || durationFrames < 1)
  ) {
    throw new RangeError('durationFrames must be a positive integer when provided.');
  }

  const seen = new Set<string>();
  const events = input.map((event, authoredIndex) => {
    if (!event.id.trim()) throw new TypeError('Scheduled event id is required.');
    if (seen.has(event.id)) throw new RangeError(`Duplicate scheduled event id ${event.id}.`);
    seen.add(event.id);
    if (!Number.isInteger(event.frame) || event.frame < 0) {
      throw new RangeError(`Event ${event.id} frame must be a non-negative integer.`);
    }
    if (durationFrames !== undefined && event.frame >= durationFrames) {
      throw new RangeError(`Event ${event.id} frame ${event.frame} is outside the scene.`);
    }
    return { event, authoredIndex };
  });

  events.sort(
    (left, right) =>
      left.event.frame - right.event.frame || left.authoredIndex - right.authoredIndex,
  );

  const ordered = Object.freeze(events.map(({ event }) => Object.freeze({ ...event })));

  return Object.freeze({
    events: ordered,
    eventsAtFrame(frame: number) {
      if (!Number.isInteger(frame)) return [];
      return ordered.filter((event) => event.frame === frame);
    },
    eventsInRange(startFrame: number, endFrame: number) {
      if (
        !Number.isInteger(startFrame) ||
        !Number.isInteger(endFrame) ||
        startFrame < 0 ||
        endFrame < startFrame
      ) {
        throw new RangeError('Event range must use non-negative integer [startFrame, endFrame) bounds.');
      }
      return ordered.filter(
        (event) => event.frame >= startFrame && event.frame < endFrame,
      );
    },
  });
}
