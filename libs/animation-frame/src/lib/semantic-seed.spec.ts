import { createChannelRng, deriveChannelSeed } from './channel-driver';
import { createDeterministicRng } from './deterministic-rng';
import {
  canonicalSemanticSeedKey,
  deriveSemanticSeed,
} from './semantic-seed';

const baseInput = {
  sceneSeed: 12345,
  sceneId: 'scene:ch01:r01:s03',
  targetId: 'actor:enki',
  channel: 'face.blink',
  purpose: 'performance',
} as const;

describe('semantic seeding and deterministic RNG', () => {
  it('produces a fixed cross-platform semantic seed fixture', () => {
    expect(deriveSemanticSeed(baseInput)).toBe(3409197092);
  });

  it('is independent of object property insertion order', () => {
    expect(
      deriveSemanticSeed({
        purpose: baseInput.purpose,
        channel: baseInput.channel,
        targetId: baseInput.targetId,
        sceneId: baseInput.sceneId,
        sceneSeed: baseInput.sceneSeed,
      }),
    ).toBe(deriveSemanticSeed(baseInput));
  });

  it('changes when a semantic channel changes', () => {
    expect(
      deriveSemanticSeed({ ...baseInput, channel: 'body.breath' }),
    ).not.toBe(deriveSemanticSeed(baseInput));
  });

  it('uses length-prefixed canonical fields so separator-like content is unambiguous', () => {
    const left = canonicalSemanticSeedKey({
      ...baseInput,
      targetId: 'actor:a|channel:b',
      channel: 'c',
    });
    const right = canonicalSemanticSeedKey({
      ...baseInput,
      targetId: 'actor:a',
      channel: 'b|channel:c',
    });
    expect(left).not.toBe(right);
  });

  it('replays the same random sequence from the same seed', () => {
    const left = createDeterministicRng(99);
    const right = createDeterministicRng(99);
    expect([left.nextUint32(), left.nextFloat(), left.nextInt(4, 9)]).toEqual([
      right.nextUint32(),
      right.nextFloat(),
      right.nextInt(4, 9),
    ]);
  });

  it('derives isolated channel streams from FrameContext identity', () => {
    const frame = {
      sceneSeed: baseInput.sceneSeed,
      sceneId: baseInput.sceneId,
    };
    const blink = deriveChannelSeed(frame, {
      targetId: 'actor:enki',
      channel: 'face.blink',
      purpose: 'performance',
    });
    const breath = deriveChannelSeed(frame, {
      targetId: 'actor:enki',
      channel: 'body.breath',
      purpose: 'performance',
    });
    expect(blink).not.toBe(breath);

    const a = createChannelRng(frame, {
      targetId: 'actor:enki',
      channel: 'face.blink',
      purpose: 'performance',
    });
    const b = createChannelRng(frame, {
      targetId: 'actor:enki',
      channel: 'face.blink',
      purpose: 'performance',
    });
    expect(a.nextFloat()).toBe(b.nextFloat());
  });

  it('rejects invalid seed inputs and random integer bounds', () => {
    expect(() => deriveSemanticSeed({ ...baseInput, sceneSeed: 1.2 })).toThrow(
      TypeError,
    );
    expect(() =>
      createDeterministicRng(2).nextInt(5, 5),
    ).toThrow(RangeError);
  });
});
