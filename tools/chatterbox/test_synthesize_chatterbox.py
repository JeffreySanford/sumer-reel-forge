import unittest

from synthesize_chatterbox import chunk_text, estimated_word_timings


class ChatterboxSynthesisTests(unittest.TestCase):
    def test_chunks_long_narration_on_sentence_boundaries(self) -> None:
        chunks = chunk_text(
            "First sentence has a measured cadence. Second sentence carries the story. "
            "Third sentence closes the thought.",
            55,
        )
        self.assertGreater(len(chunks), 1)
        self.assertTrue(all(len(chunk) <= 55 for chunk in chunks))

    def test_estimates_monotonic_word_timings(self) -> None:
        timings = estimated_word_timings("A voice crosses the water.", 3.0)
        positions = [timing["audioPositionSeconds"] for timing in timings]
        self.assertEqual(positions, sorted(positions))
        self.assertEqual(timings[0]["characterPosition"], 0)


if __name__ == "__main__":
    unittest.main()
