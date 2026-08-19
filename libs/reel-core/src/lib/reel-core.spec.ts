import { CHAPTER_ONE_REELS, CHAPTER_ONE_SUMMARY, REEL_ONE } from './reel-core';

describe('reelCore', () => {
  it('keeps the chapter outline and production episodes aligned', () => {
    expect(CHAPTER_ONE_SUMMARY).toHaveLength(18);
    expect(CHAPTER_ONE_REELS[0]).toEqual(REEL_ONE);
    expect(
      REEL_ONE.shots.reduce((sum, shot) => sum + shot.durationSeconds, 0),
    ).toBe(REEL_ONE.targetDurationSeconds);
  });
});
