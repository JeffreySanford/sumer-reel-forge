import { resolve } from 'node:path';

export function loadRendererConfig() {
  return {
    apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:3000/api',
    adapter: process.env.RENDER_ADAPTER ?? 'mock',
    outputRoot: resolve(process.env.RENDER_OUTPUT_ROOT ?? 'tmp/renders'),
    workerId: process.env.RENDER_WORKER_ID ?? `local-renderer-${process.pid}`,
    heartbeatIntervalMs: positiveNumber('RENDER_HEARTBEAT_INTERVAL_MS', 10000),
    pollIntervalMs: positiveNumber('RENDER_POLL_INTERVAL_MS', 5000),
    jobTimeoutMs: positiveNumber('RENDER_JOB_TIMEOUT_MS', 900000),
    processTimeoutMs: positiveNumber('RENDER_PROCESS_TIMEOUT_MS', 600000),
    comfyBaseUrl: process.env.COMFYUI_BASE_URL ?? 'http://127.0.0.1:8188',
    comfyWorkflowPath: process.env.COMFYUI_WORKFLOW_PATH
      ? resolve(process.env.COMFYUI_WORKFLOW_PATH)
      : undefined,
    comfyPollIntervalMs: positiveNumber('COMFYUI_POLL_INTERVAL_MS', 2000),
    ttsCommand: process.env.TTS_COMMAND ?? 'kokoro',
    ttsArgs: jsonStringArray('TTS_ARGS_JSON', [
      '--text-file',
      '{input}',
      '--output-file',
      '{output}',
      '--voice',
      '{voice}',
    ]),
    ttsVoice: process.env.TTS_VOICE ?? 'af_heart',
    whisperCommand: process.env.WHISPER_COMMAND ?? 'whisper',
    whisperArgs: jsonStringArray('WHISPER_ARGS_JSON', [
      '{input}',
      '--model',
      '{model}',
      '--output_dir',
      '{outputDirectory}',
      '--output_format',
      'srt',
    ]),
    whisperModel: process.env.WHISPER_MODEL ?? 'small',
    ffmpegCommand: process.env.FFMPEG_COMMAND ?? 'ffmpeg',
  };
}

function positiveNumber(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }
  return value;
}

function jsonStringArray(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${name} must be a JSON array of command arguments.`);
  }
  if (
    !Array.isArray(parsed) ||
    !parsed.every((item) => typeof item === 'string')
  ) {
    throw new Error(`${name} must be a JSON array of strings.`);
  }
  return parsed;
}
