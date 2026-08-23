# Startup hardware profiling

`pnpm start:all` profiles the local machine before starting Prisma, the API, web UI, and managed renderer worker. The probe is best-effort: missing GPU tools, FFmpeg, Ollama, or platform-specific utilities never prevent the studio from starting.

The current profile is written to:

```text
tmp/runtime/hardware-profile.json
```

`tmp/` is ignored by Git. The profile is local runtime state, not project configuration.

## Detected capabilities

The profiler records:

- CPU model and logical processor count
- total and currently free RAM
- free/total disk capacity for the repository volume
- NVIDIA GPU name, VRAM, and driver when `nvidia-smi` is available
- best-effort non-NVIDIA display-adapter identity on Windows, Linux, and macOS
- CUDA toolkit version when `nvcc` is available
- FFmpeg availability and NVENC encoder support
- Ollama availability and installed model names

## Derived runtime plan

The profile derives conservative local defaults rather than attempting to consume 100% of the machine:

- Remotion worker concurrency per render
- number of independent renders that may run in parallel
- Chromium hardware acceleration / GL backend
- Ollama vision-review concurrency
- ComfyUI job concurrency and VRAM class
- Chatterbox CPU/CUDA preference
- preferred H.264 encoder capability (`h264_nvenc` when available, otherwise `libx264`)

CPU and memory are reserved for the OS, PostgreSQL, API, browser, Ollama, and other local processes. More utilization is not automatically treated as better throughput.

The Reel 1 animation smoke workflow reads the persisted profile. Workstation-class machines can render Shot 3 and Shot 4 in parallel and overlap AI review with the handoff render. Smaller machines automatically serialize expensive work.

## Explicit overrides always win

Auto-detection never replaces an explicit operator setting. Supported overrides include:

```text
ANIMATION_RENDER_CONCURRENCY
ANIMATION_PARALLEL_RENDERS
ANIMATION_HARDWARE_ACCELERATION
ANIMATION_REMOTION_GL
ANIMATION_OLLAMA_REVIEW_CONCURRENCY
COMFYUI_MAX_PARALLEL
CHATTERBOX_DEVICE
FFMPEG_COMMAND
OLLAMA_BASE_URL
SRF_HARDWARE_PROFILE_PATH
```

The startup process does not modify the system `PATH`.

## Manual probe

The same profiler can be run without starting the studio:

```bash
node tools/scripts/profile-hardware.mjs
```

This refreshes `tmp/runtime/hardware-profile.json` and prints the effective recommendations.

## Performance tuning

The startup profile chooses safe defaults. Use the existing benchmark when a machine needs empirical tuning:

```bash
pnpm animation:benchmark:reel1
```

Benchmark results should determine whether higher Remotion concurrency is useful. The stored machine profile is intended to provide a portable starting point, not replace measurement.
