import argparse
from pathlib import Path

from huggingface_hub import snapshot_download


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download a pinned Chatterbox model.")
    parser.add_argument("--output-directory", required=True, type=Path)
    parser.add_argument("--revision", required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    args.output_directory.mkdir(parents=True, exist_ok=True)
    snapshot_download(
        repo_id="ResembleAI/chatterbox",
        revision=args.revision,
        local_dir=args.output_directory,
        allow_patterns=[
            "conds.pt",
            "s3gen.safetensors",
            "t3_cfg.safetensors",
            "tokenizer.json",
            "ve.safetensors",
        ],
    )
    print(f"Chatterbox model {args.revision} is ready at {args.output_directory}.")


if __name__ == "__main__":
    main()
