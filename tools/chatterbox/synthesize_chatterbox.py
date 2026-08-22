import argparse
import json
import re
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Synthesize narration with Chatterbox.")
    parser.add_argument("--text-file", required=True, type=Path)
    parser.add_argument("--output-file", required=True, type=Path)
    parser.add_argument("--timings-file", type=Path)
    parser.add_argument("--model-directory", required=True, type=Path)
    parser.add_argument("--reference-audio", type=Path)
    parser.add_argument("--device", default="auto", choices=["auto", "cuda", "cpu"])
    parser.add_argument("--exaggeration", default=0.5, type=float)
    parser.add_argument("--cfg-weight", default=0.5, type=float)
    parser.add_argument("--temperature", default=0.8, type=float)
    parser.add_argument("--seed", default=20260820, type=int)
    parser.add_argument("--chunk-characters", default=260, type=int)
    parser.add_argument("--sentence-pause", default=0.3, type=float)
    return parser.parse_args()


def chunk_text(text: str, maximum_characters: int) -> list[str]:
    if maximum_characters < 40:
        raise ValueError("chunk-characters must be at least 40.")
    sentences = [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?])\s+", text.strip())
        if sentence.strip()
    ]
    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        for part in split_long_sentence(sentence, maximum_characters):
            candidate = f"{current} {part}".strip()
            if current and len(candidate) > maximum_characters:
                chunks.append(current)
                current = part
            else:
                current = candidate
    if current:
        chunks.append(current)
    return chunks


def split_long_sentence(sentence: str, maximum_characters: int) -> list[str]:
    if len(sentence) <= maximum_characters:
        return [sentence]
    words = sentence.split()
    parts: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and len(candidate) > maximum_characters:
            parts.append(current)
            current = word
        else:
            current = candidate
    if current:
        parts.append(current)
    return parts


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
    if not args.model_directory.is_dir():
        raise FileNotFoundError(f"Model directory not found: {args.model_directory}")
    if args.reference_audio and not args.reference_audio.is_file():
        raise FileNotFoundError(f"Reference audio not found: {args.reference_audio}")

    import numpy as np
    import soundfile as sf
    import torch
    from chatterbox.tts import ChatterboxTTS

    device = args.device
    if device == "auto":
        device = "cuda" if torch.cuda.is_available() else "cpu"
    if device == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("CUDA was requested, but PyTorch cannot access the GPU.")

    model = ChatterboxTTS.from_local(args.model_directory, device=device)
    chunks = chunk_text(text, args.chunk_characters)
    pause = np.zeros(max(0, round(model.sr * args.sentence_pause)), dtype=np.float32)
    rendered: list[np.ndarray] = []
    for index, chunk in enumerate(chunks):
        torch.manual_seed(args.seed + index)
        if device == "cuda":
            torch.cuda.manual_seed_all(args.seed + index)
        waveform = model.generate(
            chunk,
            audio_prompt_path=(
                str(args.reference_audio) if args.reference_audio else None
            ),
            exaggeration=args.exaggeration,
            cfg_weight=args.cfg_weight,
            temperature=args.temperature,
        )
        rendered.append(waveform.squeeze().detach().cpu().numpy().astype(np.float32))
        if index < len(chunks) - 1 and len(pause) > 0:
            rendered.append(pause)

    samples = np.concatenate(rendered)
    args.output_file.parent.mkdir(parents=True, exist_ok=True)
    sf.write(args.output_file, samples, model.sr, subtype="PCM_16")
    duration_seconds = len(samples) / model.sr
    if args.timings_file:
        args.timings_file.write_text(
            json.dumps(estimated_word_timings(text, duration_seconds), indent=2),
            encoding="utf-8",
        )
    print(
        f"Created {args.output_file} with Chatterbox on {device} "
        f"({len(chunks)} chunks, {duration_seconds:.2f}s)."
    )


if __name__ == "__main__":
    main()
