import { Injectable } from '@nestjs/common';
import { spawnSync } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type Status = 'ready' | 'limited' | 'unavailable' | 'unknown';

interface SoftwareCapability {
  id: string;
  label: string;
  status: Status;
  detail: string;
  version?: string;
}

interface Projection {
  id: string;
  title: string;
  status: Status;
  summary: string;
  basis: string[];
  recommendation?: string;
}

@Injectable()
export class RuntimeCapabilitiesService {
  async getCapabilities() {
    const layerWorkflowPath = process.env.COMFYUI_LAYER_WORKFLOW_PATH
      ? resolve(process.env.COMFYUI_LAYER_WORKFLOW_PATH)
      : undefined;
    const [startupProfile, packageJson, ollama, comfyui, layerWorkflowReady] =
      await Promise.all([
        readJson(
          resolve(
            process.env.SRF_HARDWARE_PROFILE_PATH ??
              'tmp/runtime/hardware-profile.json',
          ),
        ),
        readJson(resolve('package.json')),
        probeJsonEndpoint(
          `${(process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '')}/api/tags`,
        ),
        probeJsonEndpoint(
          `${(process.env.COMFYUI_BASE_URL ?? 'http://127.0.0.1:8188').replace(/\/$/, '')}/system_stats`,
        ),
        fileExists(layerWorkflowPath),
      ]);

    const runtimePlan = startupProfile?.runtimePlan ?? null;
    const software = buildSoftwareCapabilities({
      packageJson,
      startupProfile,
      ollama,
      comfyui,
      layerWorkflowPath,
      layerWorkflowReady,
    });
    const projectionProfile = {
      ...startupProfile,
      ollama: {
        ...(startupProfile?.ollama ?? {}),
        models: extractOllamaModels(ollama.payload),
      },
    };
    const projections = buildRuntimeProjections(projectionProfile, software);

    return {
      schemaVersion: 1,
      source: startupProfile ? 'startup-profile' : 'live-fallback',
      profileGeneratedAt: startupProfile?.generatedAt ?? null,
      observedAt: new Date().toISOString(),
      host:
        startupProfile?.host ??
        process.env.COMPUTERNAME ??
        process.env.HOSTNAME ??
        'local-host',
      platform: startupProfile?.platform ?? process.platform,
      arch: startupProfile?.arch ?? process.arch,
      cpu: startupProfile?.cpu ?? null,
      memory: startupProfile?.memory ?? null,
      disk: startupProfile?.disk ?? null,
      gpu: startupProfile?.gpu ?? {
        nvidiaSmiAvailable: false,
        devices: [],
      },
      media: startupProfile?.media ?? null,
      ollama: {
        baseUrl: (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(
          /\/$/,
          '',
        ),
        online: ollama.ok,
        models: extractOllamaModels(ollama.payload),
      },
      comfyui: {
        baseUrl: (
          process.env.COMFYUI_BASE_URL ?? 'http://127.0.0.1:8188'
        ).replace(/\/$/, ''),
        online: comfyui.ok,
        detail: comfyui.ok
          ? summarizeComfySystem(comfyui.payload)
          : (comfyui.error ?? 'Not responding'),
        layerWorkflowPath: layerWorkflowPath ?? null,
        layerWorkflowReady,
      },
      runtimePlan,
      software,
      projections,
    };
  }
}

function buildSoftwareCapabilities({
  packageJson,
  startupProfile,
  ollama,
  comfyui,
  layerWorkflowPath,
  layerWorkflowReady,
}: {
  packageJson: any;
  startupProfile: any;
  ollama: ProbeResult;
  comfyui: ProbeResult;
  layerWorkflowPath?: string;
  layerWorkflowReady: boolean;
}): SoftwareCapability[] {
  const deps = {
    ...(packageJson?.dependencies ?? {}),
    ...(packageJson?.devDependencies ?? {}),
  };
  const ffmpegReady =
    Boolean(startupProfile?.media?.ffmpegAvailable) ||
    commandVersion('ffmpeg', ['-version']).ok;
  const ffprobeReady = commandVersion(
    process.env.FFPROBE_COMMAND ?? 'ffprobe',
    ['-version'],
  ).ok;
  const docker = commandVersion('docker', ['--version']);
  const pnpm = commandVersion('pnpm', ['--version']);
  const git = commandVersion('git', ['--version']);

  return [
    {
      id: 'node',
      label: 'Node.js',
      status: 'ready',
      detail: 'Application runtime',
      version: process.version,
    },
    {
      id: 'pnpm',
      label: 'pnpm',
      status: pnpm.ok ? 'ready' : 'unavailable',
      detail: pnpm.ok
        ? 'Workspace package manager available'
        : 'pnpm command not found',
      version: pnpm.version,
    },
    packageCapability(
      'angular',
      'Angular',
      deps['@angular/core'],
      'Studio UI framework',
    ),
    packageCapability(
      'remotion',
      'Remotion',
      deps.remotion,
      'Deterministic animation renderer',
    ),
    packageCapability(
      'nestjs',
      'NestJS',
      deps['@nestjs/core'],
      'Local API runtime',
    ),
    packageCapability(
      'prisma',
      'Prisma',
      deps.prisma,
      'Persistence client and migrations',
    ),
    {
      id: 'docker',
      label: 'Docker',
      status: docker.ok ? 'ready' : 'unavailable',
      detail: docker.ok
        ? 'Container runtime command available'
        : 'Docker command not found',
      version: docker.version,
    },
    {
      id: 'ffmpeg',
      label: 'FFmpeg',
      status: ffmpegReady ? 'ready' : 'unavailable',
      detail: startupProfile?.media?.encoders?.h264Nvenc
        ? 'Media pipeline available with NVIDIA H.264 encoder'
        : ffmpegReady
          ? 'Media pipeline available with software encoding'
          : 'FFmpeg not detected',
    },
    {
      id: 'ffprobe',
      label: 'FFprobe',
      status: ffprobeReady ? 'ready' : 'unavailable',
      detail: ffprobeReady
        ? 'Render validation available'
        : 'FFprobe not detected',
    },
    {
      id: 'ollama',
      label: 'Ollama',
      status: ollama.ok ? 'ready' : 'unavailable',
      detail: ollama.ok
        ? `${extractOllamaModels(ollama.payload).length} local model(s) reachable`
        : (ollama.error ?? 'Ollama is not responding'),
    },
    {
      id: 'comfyui',
      label: 'ComfyUI',
      status: comfyui.ok ? 'ready' : 'unavailable',
      detail: comfyui.ok
        ? summarizeComfySystem(comfyui.payload)
        : (comfyui.error ?? 'ComfyUI is not responding'),
    },
    {
      id: 'comfyui-layer-workflow',
      label: 'ComfyUI Layer Workflow',
      status: layerWorkflowReady ? 'ready' : 'unavailable',
      detail: layerWorkflowReady
        ? `Candidate workflow available: ${layerWorkflowPath}`
        : layerWorkflowPath
          ? `Layer workflow not found: ${layerWorkflowPath}`
          : 'COMFYUI_LAYER_WORKFLOW_PATH is not configured',
    },
    {
      id: 'cuda',
      label: 'NVIDIA / CUDA',
      status: startupProfile?.gpu?.nvidiaSmiAvailable
        ? 'ready'
        : 'unavailable',
      detail: startupProfile?.gpu?.nvidiaSmiAvailable
        ? startupProfile?.gpu?.cudaToolkit
          ? `NVIDIA driver detected; CUDA toolkit ${startupProfile.gpu.cudaToolkit}`
          : 'NVIDIA driver detected; CUDA-capable workloads available through driver/runtime'
        : 'NVIDIA CUDA capability not detected',
    },
    {
      id: 'nvenc',
      label: 'NVENC',
      status: startupProfile?.media?.encoders?.h264Nvenc
        ? 'ready'
        : 'unavailable',
      detail: startupProfile?.media?.encoders?.h264Nvenc
        ? 'Hardware H.264 encoding is available'
        : 'Hardware H.264 encoding not detected',
    },
    {
      id: 'git',
      label: 'Git',
      status: git.ok ? 'ready' : 'unavailable',
      detail: git.ok ? 'Source control command available' : 'Git command not found',
      version: git.version,
    },
  ];
}

export function buildRuntimeProjections(
  profile: any,
  software: SoftwareCapability[],
): Projection[] {
  const plan = profile?.runtimePlan;
  const status = (id: string) =>
    software.find((item) => item.id === id)?.status ?? 'unknown';
  const models: string[] = Array.isArray(profile?.ollama?.models)
    ? profile.ollama.models
    : [];
  const textModel = models.find((model) => !/vl|vision/i.test(model));
  const visionModel = models.find((model) => /vl|vision/i.test(model));
  const remotionWorkers = Number(plan?.remotion?.concurrencyPerRender ?? 1);
  const parallelRenders = Number(plan?.remotion?.parallelRenders ?? 1);
  const ollamaConcurrency = Number(plan?.ai?.ollamaReviewConcurrency ?? 1);
  const comfyConcurrency = Number(plan?.ai?.comfyConcurrency ?? 1);
  const vramMode = plan?.ai?.comfyVramMode ?? 'unknown';
  const layerWorkflowReady = status('comfyui-layer-workflow') === 'ready';

  return [
    {
      id: 'scene-v2-rendering',
      title: 'Scene V2 cinematic rendering',
      status:
        status('remotion') === 'ready' && status('ffmpeg') === 'ready'
          ? 'ready'
          : 'unavailable',
      summary: `${parallelRenders} render process(es) with about ${remotionWorkers} Remotion worker(s) each.`,
      basis: ['Remotion', 'FFmpeg', 'CPU/RAM runtime plan'],
      recommendation: `Use the startup profile as the default; benchmark before increasing past ${remotionWorkers} workers.`,
    },
    {
      id: 'parallel-benchmarks',
      title: 'Parallel animation benchmarks',
      status: parallelRenders >= 2 ? 'ready' : 'limited',
      summary:
        parallelRenders >= 2
          ? `Shot benchmarks can run ${parallelRenders} at a time while reserving host capacity.`
          : 'Run shot benchmarks serially on this host.',
      basis: ['Logical CPU count', 'RAM capacity'],
    },
    {
      id: 'local-direction-ai',
      title: 'Local AI direction planning',
      status: status('ollama') === 'ready' ? 'ready' : 'unavailable',
      summary:
        status('ollama') === 'ready'
          ? `Local text planning is available${textModel ? ` with ${textModel}` : ''}.`
          : 'Direction planning falls back to deterministic rules until Ollama is reachable.',
      basis: ['Ollama reachability', 'Installed text models'],
    },
    {
      id: 'vision-review',
      title: 'AI contact-sheet review',
      status:
        status('ollama') === 'ready' && visionModel
          ? 'ready'
          : status('ollama') === 'ready'
            ? 'limited'
            : 'unavailable',
      summary: visionModel
        ? `${visionModel} can review up to ${ollamaConcurrency} contact sheet(s) concurrently.`
        : 'No vision-capable Ollama model was reported by the live runtime.',
      basis: ['Ollama', 'Vision model', 'VRAM-derived review concurrency'],
    },
    {
      id: 'animation-layer-generation',
      title: 'GPU animation-layer generation',
      status:
        status('comfyui') === 'ready' &&
        status('cuda') === 'ready' &&
        layerWorkflowReady
          ? 'ready'
          : status('comfyui') === 'ready' && layerWorkflowReady
            ? 'limited'
            : 'unavailable',
      summary:
        status('comfyui') !== 'ready'
          ? 'ComfyUI is not currently reachable, so layered asset generation is not yet available.'
          : !layerWorkflowReady
            ? 'ComfyUI is reachable, but the dedicated animation-layer workflow is not configured.'
            : `ComfyUI is reachable; plan ${comfyConcurrency} generation job(s) at a time in ${vramMode} mode.`,
      basis: [
        'ComfyUI reachability',
        'Dedicated layer workflow',
        'GPU/VRAM',
        'CUDA capability',
      ],
      recommendation:
        status('comfyui') !== 'ready'
          ? 'Start/configure ComfyUI, then refresh this view before generating animation-v1 candidates.'
          : !layerWorkflowReady
            ? 'Export a ComfyUI API-format layer workflow and set COMFYUI_LAYER_WORKFLOW_PATH.'
            : 'Generate candidate masks/layers only; keep human approval mandatory before animation-v1 activation.',
    },
    {
      id: 'hardware-encoding',
      title: 'Hardware H.264 encoding',
      status: status('nvenc'),
      summary:
        status('nvenc') === 'ready'
          ? 'NVENC is available for encode-heavy paths when compatibility tests justify enabling it.'
          : 'Continue with libx264/software encoding.',
      basis: ['FFmpeg encoder inventory', 'NVIDIA capability'],
    },
    {
      id: 'reel1-production',
      title: 'Reel 1 local production loop',
      status:
        status('remotion') === 'ready' && status('ffmpeg') === 'ready'
          ? 'ready'
          : 'limited',
      summary:
        status('remotion') === 'ready' && status('ffmpeg') === 'ready'
          ? 'Scene validation, benchmark rendering, handoff rendering, contact sheets, ffprobe validation, and human review are supported locally.'
          : 'One or more core render dependencies are missing.',
      basis: ['Scene V2', 'Remotion', 'FFmpeg/FFprobe', 'Human approval'],
    },
  ];
}

function packageCapability(
  id: string,
  label: string,
  version: string | undefined,
  detail: string,
): SoftwareCapability {
  return {
    id,
    label,
    status: version ? 'ready' : 'unavailable',
    detail: version ? detail : `${label} dependency not found`,
    version,
  };
}

interface ProbeResult {
  ok: boolean;
  payload?: any;
  error?: string;
}

async function probeJsonEndpoint(url: string): Promise<ProbeResult> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(1400),
    });
    if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
    return { ok: true, payload: await response.json() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function readJson(path: string): Promise<any | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return undefined;
  }
}

async function fileExists(path?: string): Promise<boolean> {
  if (!path) return false;
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function commandVersion(
  command: string,
  args: string[],
): { ok: boolean; version?: string } {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 1800,
    shell: process.platform === 'win32',
  });
  if (result.error || result.status !== 0) return { ok: false };
  const firstLine = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  return { ok: true, version: firstLine };
}

function extractOllamaModels(payload: any): string[] {
  if (!Array.isArray(payload?.models)) return [];
  return payload.models
    .map((model: any) => model?.name ?? model?.model)
    .filter((name: unknown): name is string => typeof name === 'string');
}

function summarizeComfySystem(payload: any): string {
  const devices = Array.isArray(payload?.devices) ? payload.devices : [];
  const gpu = devices.find((device: any) =>
    /cuda|nvidia/i.test(`${device?.type ?? ''} ${device?.name ?? ''}`),
  );
  if (gpu?.name) return `Online on ${gpu.name}`;
  return 'ComfyUI API is reachable';
}
