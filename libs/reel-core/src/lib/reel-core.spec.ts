import { CHAPTER_ONE_REELS, CHAPTER_ONE_SUMMARY, REEL_ONE } from './reel-core';

describe('reelCore', () => {
  it('keeps the chapter outline and production episodes aligned', () => {
    expect(CHAPTER_ONE_SUMMARY).toHaveLength(18);
    expect(CHAPTER_ONE_REELS[0]).toEqual(REEL_ONE);
    for (const episode of CHAPTER_ONE_REELS) {
      expect(episode.shots.length).toBeGreaterThanOrEqual(6);
      expect(
        episode.shots.reduce((sum, shot) => sum + shot.durationSeconds, 0),
      ).toBe(episode.targetDurationSeconds);
      expect(episode.onScreenText.length).toBeGreaterThanOrEqual(5);
      expect(episode.shots.every((shot) => shot.prompt.length > 120)).toBe(
        true,
      );
    }
  });
});
