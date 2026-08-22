import argparse
import json
import re
from pathlib import Path

import soundfile as sf
from kokoro_onnx import Kokoro


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Synthesize a WAV with Kokoro ONNX.")
    parser.add_argument("--text-file", required=True, type=Path)
    parser.add_argument("--output-file", required=True, type=Path)
    parser.add_argument("--timings-file", type=Path)
    parser.add_argument("--model", required=True, type=Path)
    parser.add_argument("--voices", required=True, type=Path)
    parser.add_argument("--voice", default="af_heart")
    parser.add_argument("--speed", default=0.9, type=float)
    return parser.parse_args()


def estimated_word_timings(text: str, duration_seconds: float) -> list[dict]:
    words = list(re.finditer(r"\S+", text))
    if not words:
        return []

    weights = []
    for word in words:
        spoken = re.sub(r"[^A-Za-z0-9]", "", word.group())
        punctuation_pause = 2.5 if word.group().endswith((".", "!", "?")) else 0.8
        weights.append(max(1.0, len(spoken) ** 0.65) + punctuation_pause)

    usable_duration = duration_seconds * 0.97
    total_weight = sum(weights)
    elapsed_weight = 0.0
    timings = []
    for word, weight in zip(words, weights, strict=True):
        timings.append(
            {
                "characterPosition": word.start(),
                "audioPositionSeconds": usable_duration * elapsed_weight / total_weight,
            }
        )
        elapsed_weight += weight
    return timings


def main() -> None:
    args = parse_args()
    text = args.text_file.read_text(encoding="utf-8").strip()
    if not text:
        raise ValueError("Narration text is empty.")

    engine = Kokoro(str(args.model), str(args.voices))
    samples, sample_rate = engine.create(
        text,
        voice=args.voice,
        speed=args.speed,
        lang="en-us",
        sentence_pause=0.32,
        clause_pause=0.14,
    )
    args.output_file.parent.mkdir(parents=True, exist_ok=True)
    sf.write(args.output_file, samples, sample_rate, subtype="PCM_16")

    if args.timings_file:
        duration_seconds = len(samples) / sample_rate
        timings = estimated_word_timings(text, duration_seconds)
        args.timings_file.write_text(json.dumps(timings, indent=2), encoding="utf-8")

    print(
        f"Created {args.output_file} with {args.voice} at {args.speed:.2f}x "
        f"({len(samples) / sample_rate:.2f}s)."
    )


if __name__ == "__main__":
    main()
