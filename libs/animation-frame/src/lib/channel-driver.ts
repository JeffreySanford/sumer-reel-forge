import type { FrameContext } from './frame-context';
import { createDeterministicRng, type DeterministicRng } from './deterministic-rng';
import { deriveSemanticSeed } from './semantic-seed';

export interface ChannelSeedInput {
  readonly targetId: string;
  readonly channel: string;
  readonly purpose: string;
}

export function deriveChannelSeed(
  frame: Pick<FrameContext, 'sceneSeed' | 'sceneId'>,
  input: ChannelSeedInput,
): number {
  return deriveSemanticSeed({
    sceneSeed: frame.sceneSeed,
    sceneId: frame.sceneId,
    targetId: input.targetId,
    channel: input.channel,
    purpose: input.purpose,
    version: 1,
  });
}

export function createChannelRng(
  frame: Pick<FrameContext, 'sceneSeed' | 'sceneId'>,
  input: ChannelSeedInput,
): DeterministicRng {
  return createDeterministicRng(deriveChannelSeed(frame, input));
}
