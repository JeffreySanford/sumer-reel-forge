import unittest

from synthesize_kokoro import estimated_word_timings


class EstimatedWordTimingsTest(unittest.TestCase):
    def test_returns_monotonic_character_and_audio_positions(self) -> None:
        text = "Water for travelers. Truth for everyone."

        timings = estimated_word_timings(text, 12.0)

        self.assertEqual(len(timings), 6)
        self.assertEqual(timings[0]["characterPosition"], 0)
        self.assertTrue(
            all(
                current["audioPositionSeconds"] < following["audioPositionSeconds"]
                for current, following in zip(timings, timings[1:], strict=False)
            )
        )
        self.assertLess(timings[-1]["audioPositionSeconds"], 12.0)

    def test_empty_text_returns_no_timings(self) -> None:
        self.assertEqual(estimated_word_timings("   ", 5.0), [])


if __name__ == "__main__":
    unittest.main()
