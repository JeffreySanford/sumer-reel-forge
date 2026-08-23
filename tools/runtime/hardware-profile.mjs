import { spawnSync } from 'node:child_process';
import { mkdirSync, statfsSync, writeFileSync } from 'node:fs';
import { arch, cpus, freemem, hostname, platform, totalmem } from 'node:os';
import { dirname, resolve } from 'node:path';

const GIB = 1024 ** 3;
const MIB = 1024 ** 2;

export async function collectHardwareProfile(options = {}) {
  const root = resolve(options.root ?? '.');
  const env = options.env ?? process.env;
  const runCommand = options.runCommand ?? defaultRunCommand;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const cpuList = cpus();
  const totalMemoryGb = round1(totalmem() / GIB);
  const freeMemoryGb = round1(freemem() / GIB);
  const nvidia = detectNvidia(runCommand);
  const genericGpu = nvidia.gpus.length > 0 ? [] : detectGenericGpu(runCommand);
  const ffmpeg = detectFfmpeg(runCommand, env.FFMPEG_COMMAND ?? 'ffmpeg');
  const cudaToolkit = detectCudaToolkit(runCommand);
  const ollama = await detectOllama(fetchImpl, env);

  const profile = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    host: hostname(),
    platform: platform(),
    arch: arch(),
    cpu: {
      model: cpuList[0]?.model?.trim() || 'unknown',
      logicalCount: Math.max(1, cpuList.length),
      averageReportedMhz: Math.round(
        cpuList.reduce((sum, cpu) => sum + (cpu.speed || 0), 0) /
          Math.max(1, cpuList.length),
      ),
    },
    memory: {
      totalGb: totalMemoryGb,
      freeGb: freeMemoryGb,
    },
    disk: detectDisk(root),
    gpu: {
      nvidiaSmiAvailable: nvidia.available,
      devices: nvidia.gpus.length > 0 ? nvidia.gpus : genericGpu,
      cudaToolkit,
    },
    media: ffmpeg,
    ollama,
  };

  profile.runtimePlan = deriveRuntimePlan(profile, env);
  return profile;
}

export async function collectAndPersistHardwareProfile(options = {}) {
  const root = resolve(options.root ?? '.');
  const env = options.env ?? process.env;
  const outputPath = resolve(
    env.SRF_HARDWARE_PROFILE_PATH ??
      options.outputPath ??
      resolve(root, 'tmp', 'runtime', 'hardware-profile.json'),
  );
  const profile = await collectHardwareProfile({ ...options, root, env });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(profile, null, 2)}\n`, 'utf8');
  return { profile, outputPath };
}

export function deriveRuntimePlan(profile, env = {}) {
  const logicalCpuCount = Math.max(1, Number(profile.cpu?.logicalCount ?? 1));
  const totalMemoryGb = Math.max(1, Number(profile.memory?.totalGb ?? 1));
  const gpuDevices = Array.isArray(profile.gpu?.devices) ? profile.gpu.devices : [];
  const maxVramGb = gpuDevices.reduce(
    (max, gpu) => Math.max(max, Number(gpu.memoryTotalMb ?? 0) / 1024),
    0,
  );
  const hasGpu = gpuDevices.length > 0;
  const hasNvidia = Boolean(profile.gpu?.nvidiaSmiAvailable);
  const hasNvenc = Boolean(profile.media?.encoders?.h264Nvenc);

  const automaticParallelRenders =
    logicalCpuCount >= 16 && totalMemoryGb >= 24 ? 2 : 1;
  const parallelRenders =
    positiveInteger(env.ANIMATION_PARALLEL_RENDERS) ?? automaticParallelRenders;
  const reservedCpu =
    logicalCpuCount >= 16 ? 4 : logicalCpuCount >= 8 ? 2 : logicalCpuCount >= 4 ? 1 : 0;
  const cpuBudget = Math.max(1, logicalCpuCount - reservedCpu);
  const cpuPerRender = Math.max(1, Math.floor(cpuBudget / parallelRenders));
  const memoryWorkerCap = Math.max(
    1,
    Math.floor(totalMemoryGb / Math.max(1, parallelRenders * 4)),
  );
  const automaticRemotionConcurrency = clamp(
    Math.min(cpuPerRender, memoryWorkerCap),
    logicalCpuCount >= 4 ? 2 : 1,
    12,
  );
  const remotionConcurrency =
    positiveInteger(env.ANIMATION_RENDER_CONCURRENCY) ?? automaticRemotionConcurrency;

  const automaticOllamaReviewConcurrency =
    maxVramGb >= 20 ? 3 : maxVramGb >= 8 ? 2 : 1;
  const ollamaReviewConcurrency =
    positiveInteger(env.ANIMATION_OLLAMA_REVIEW_CONCURRENCY) ??
    automaticOllamaReviewConcurrency;
  const comfyConcurrency =
    positiveInteger(env.COMFYUI_MAX_PARALLEL) ?? (maxVramGb >= 20 ? 2 : 1);
  const comfyVramMode =
    maxVramGb >= 16
      ? 'highvram-capable'
      : maxVramGb >= 8
        ? 'normalvram'
        : maxVramGb >= 4
          ? 'lowvram'
          : 'cpu-or-lowvram';

  return {
    tier: classifyTier(logicalCpuCount, totalMemoryGb, maxVramGb),
    remotion: {
      parallelRenders,
      concurrencyPerRender: remotionConcurrency,
      hardwareAcceleration:
        env.ANIMATION_HARDWARE_ACCELERATION === 'disable'
          ? 'disable'
          : 'if-possible',
      gl:
        env.ANIMATION_REMOTION_GL?.trim() ||
        (profile.platform === 'win32' && hasGpu ? 'angle' : undefined),
      source:
        env.ANIMATION_RENDER_CONCURRENCY || env.ANIMATION_PARALLEL_RENDERS
          ? 'environment-override'
          : 'autodetected',
    },
    ai: {
      nvidiaCudaAvailable: hasNvidia,
      ollamaOnline: Boolean(profile.ollama?.online),
      ollamaReviewConcurrency,
      comfyConcurrency,
      comfyVramMode,
      chatterboxDevice: hasNvidia ? 'cuda' : 'cpu',
    },
    encoding: {
      ffmpegAvailable: Boolean(profile.media?.ffmpegAvailable),
      nvencAvailable: hasNvenc,
      preferredH264Encoder: hasNvenc ? 'h264_nvenc' : 'libx264',
    },
    reserves: {
      logicalCpuReserved: reservedCpu,
      estimatedMemoryGbReserved: Math.max(4, Math.round(totalMemoryGb * 0.2)),
    },
  };
}

export function applyHardwareProfileEnvironment(profile, env = process.env, outputPath) {
  const plan = profile.runtimePlan;
  if (outputPath && !env.SRF_HARDWARE_PROFILE_PATH) {
    env.SRF_HARDWARE_PROFILE_PATH = outputPath;
  }
  setDefault(env, 'ANIMATION_RENDER_CONCURRENCY', plan.remotion.concurrencyPerRender);
  setDefault(env, 'ANIMATION_PARALLEL_RENDERS', plan.remotion.parallelRenders);
  setDefault(env, 'ANIMATION_HARDWARE_ACCELERATION', plan.remotion.hardwareAcceleration);
  if (plan.remotion.gl) setDefault(env, 'ANIMATION_REMOTION_GL', plan.remotion.gl);
  setDefault(env, 'ANIMATION_OLLAMA_REVIEW_CONCURRENCY', plan.ai.ollamaReviewConcurrency);
  setDefault(env, 'COMFYUI_MAX_PARALLEL', plan.ai.comfyConcurrency);
  if (!env.CHATTERBOX_DEVICE || env.CHATTERBOX_DEVICE === 'auto') {
    env.CHATTERBOX_DEVICE = plan.ai.chatterboxDevice;
  }
  return env;
}

export function formatHardwareProfile(profile, outputPath) {
  const gpuText = profile.gpu.devices.length
    ? profile.gpu.devices
        .map((gpu) => {
          const memory = gpu.memoryTotalMb
            ? ` ${(gpu.memoryTotalMb / 1024).toFixed(1)} GB VRAM`
            : '';
          return `${gpu.name}${memory}`;
        })
        .join('; ')
    : 'no GPU detected';
  const models = profile.ollama.online
    ? profile.ollama.models.slice(0, 5).join(', ') || 'online / no models reported'
    : 'offline';
  const plan = profile.runtimePlan;
  return [
    'Hardware profile',
    `  CPU: ${profile.cpu.model} / ${profile.cpu.logicalCount} logical`,
    `  RAM: ${profile.memory.totalGb} GB total / ${profile.memory.freeGb} GB free`,
    `  GPU: ${gpuText}`,
    `  CUDA: ${plan.ai.nvidiaCudaAvailable ? 'available through NVIDIA driver' : 'not detected'}${profile.gpu.cudaToolkit ? ` / toolkit ${profile.gpu.cudaToolkit}` : ''}`,
    `  FFmpeg: ${profile.media.ffmpegAvailable ? 'available' : 'not detected'} / NVENC ${plan.encoding.nvencAvailable ? 'available' : 'not detected'}`,
    `  Ollama: ${models}`,
    `  Runtime tier: ${plan.tier}`,
    `  Remotion: ${plan.remotion.parallelRenders} parallel render(s) × ${plan.remotion.concurrencyPerRender} worker(s)${plan.remotion.gl ? ` / GL ${plan.remotion.gl}` : ''}`,
    `  AI: Ollama review concurrency ${plan.ai.ollamaReviewConcurrency} / ComfyUI concurrency ${plan.ai.comfyConcurrency} / ${plan.ai.comfyVramMode}`,
    `  H.264 preference: ${plan.encoding.preferredH264Encoder}`,
    ...(outputPath ? [`  Profile: ${outputPath}`] : []),
  ].join('\n');
}

function detectNvidia(runCommand) {
  const result = runCommand('nvidia-smi', [
    '--query-gpu=index,name,memory.total,driver_version',
    '--format=csv,noheader,nounits',
  ]);
  if (!result.ok) return { available: false, gpus: [] };
  const gpus = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(',').map((part) => part.trim());
      return {
        vendor: 'NVIDIA',
        index: Number(parts[0]),
        name: parts[1] || 'NVIDIA GPU',
        memoryTotalMb: Number(parts[2]) || undefined,
        driverVersion: parts[3] || undefined,
      };
    });
  return { available: true, gpus };
}

function detectGenericGpu(runCommand) {
  if (platform() === 'win32') {
    const result = runCommand('powershell.exe', [
      '-NoProfile',
      '-Command',
      'Get-CimInstance Win32_VideoController | Select-Object Name,DriverVersion | ConvertTo-Json -Compress',
    ]);
    if (!result.ok || !result.stdout.trim()) return [];
    try {
      const parsed = JSON.parse(result.stdout);
      const entries = Array.isArray(parsed) ? parsed : [parsed];
      return entries
        .filter((entry) => entry?.Name)
        .map((entry, index) => ({
          vendor: inferVendor(entry.Name),
          index,
          name: entry.Name,
          driverVersion: entry.DriverVersion,
        }));
    } catch {
      return [];
    }
  }
  if (platform() === 'linux') {
    const result = runCommand('lspci', []);
    if (!result.ok) return [];
    return result.stdout
      .split(/\r?\n/)
      .filter((line) => /(VGA compatible controller|3D controller|Display controller)/i.test(line))
      .map((line, index) => ({ vendor: inferVendor(line), index, name: line.trim() }));
  }
  if (platform() === 'darwin') {
    const result = runCommand('system_profiler', ['SPDisplaysDataType', '-json']);
    if (!result.ok) return [];
    try {
      const parsed = JSON.parse(result.stdout);
      const entries = parsed.SPDisplaysDataType ?? [];
      return entries.map((entry, index) => ({
        vendor: inferVendor(entry.sppci_model ?? entry._name ?? 'Apple GPU'),
        index,
        name: entry.sppci_model ?? entry._name ?? 'Apple GPU',
      }));
    } catch {
      return [];
    }
  }
  return [];
}

function detectFfmpeg(runCommand, ffmpegCommand) {
  const result = runCommand(ffmpegCommand, ['-hide_banner', '-encoders']);
  const output = result.stdout + result.stderr;
  return {
    ffmpegCommand,
    ffmpegAvailable: result.ok,
    encoders: {
      h264Nvenc: /\bh264_nvenc\b/.test(output),
      hevcNvenc: /\bhevc_nvenc\b/.test(output),
      av1Nvenc: /\bav1_nvenc\b/.test(output),
    },
  };
}

function detectCudaToolkit(runCommand) {
  const result = runCommand('nvcc', ['--version']);
  if (!result.ok) return undefined;
  const match = `${result.stdout}\n${result.stderr}`.match(/release\s+(\d+(?:\.\d+)?)/i);
  return match?.[1];
}

async function detectOllama(fetchImpl, env) {
  const baseUrl = (env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '');
  if (typeof fetchImpl !== 'function') {
    return { baseUrl, online: false, models: [] };
  }
  try {
    const response = await fetchImpl(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return { baseUrl, online: false, models: [] };
    const payload = await response.json();
    const models = Array.isArray(payload.models)
      ? payload.models
          .map((model) => model.name ?? model.model)
          .filter((name) => typeof name === 'string')
      : [];
    return { baseUrl, online: true, models };
  } catch {
    return { baseUrl, online: false, models: [] };
  }
}

function detectDisk(root) {
  try {
    const stats = statfsSync(root);
    return {
      freeGb: round1((stats.bavail * stats.bsize) / GIB),
      totalGb: round1((stats.blocks * stats.bsize) / GIB),
    };
  } catch {
    return { freeGb: undefined, totalGb: undefined };
  }
}

function defaultRunCommand(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 3000,
  });
  return {
    ok: !result.error && result.status === 0,
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function classifyTier(cpuCount, memoryGb, vramGb) {
  if (cpuCount >= 16 && memoryGb >= 32 && vramGb >= 8) return 'workstation';
  if (cpuCount >= 8 && memoryGb >= 16) return 'performance';
  if (cpuCount >= 4 && memoryGb >= 8) return 'standard';
  return 'constrained';
}

function inferVendor(name) {
  if (/nvidia/i.test(name)) return 'NVIDIA';
  if (/amd|radeon/i.test(name)) return 'AMD';
  if (/intel/i.test(name)) return 'Intel';
  if (/apple/i.test(name)) return 'Apple';
  return 'unknown';
}

function positiveInteger(value) {
  if (value === undefined || value === null || String(value).trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function setDefault(env, name, value) {
  if (env[name] === undefined || env[name] === '') env[name] = String(value);
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function round1(value) {
  return Math.round(value * 10) / 10;
}
