import { readFileSync } from 'node:fs';
import { cpus, hostname, platform, totalmem } from 'node:os';
import { resolve } from 'node:path';

export interface LocalRenderProfile {
  logicalCpuCount: number;
  totalMemoryGb: number;
  concurrency: number;
  parallelRenders: number;
  ollamaReviewConcurrency: number;
  hardwareAcceleration: 'if-possible' | 'disable';
  gl?: 'angle' | 'egl' | 'swiftshader' | 'swangle' | 'vulkan' | 'angle-egl';
  source?: 'environment' | 'startup-profile' | 'fallback';
}

interface StartupHardwareProfile {
  schemaVersion?: number;
  host?: string;
  cpu?: { logicalCount?: number };
  memory?: { totalGb?: number };
  runtimePlan?: {
    remotion?: {
      parallelRenders?: number;
      concurrencyPerRender?: number;
      hardwareAcceleration?: 'if-possible' | 'disable';
      gl?: string;
    };
    ai?: {
      ollamaReviewConcurrency?: number;
    };
  };
}

export function getLocalRenderProfile(
  env: NodeJS.ProcessEnv = process.env,
  startupProfile: StartupHardwareProfile | undefined = loadStartupHardwareProfile(env),
): LocalRenderProfile {
  const logicalCpuCount = Math.max(
    1,
    Number(startupProfile?.cpu?.logicalCount ?? cpus().length),
  );
  const totalMemoryGb = Number(
    startupProfile?.memory?.totalGb ??
      Math.round((totalmem() / 1024 ** 3) * 10) / 10,
  );
  const requestedConcurrency = parsePositiveInteger(
    'ANIMATION_RENDER_CONCURRENCY',
    env.ANIMATION_RENDER_CONCURRENCY,
  );
  const profiledConcurrency = positiveInteger(
    startupProfile?.runtimePlan?.remotion?.concurrencyPerRender,
  );
  const fallbackConcurrency = Math.max(
    2,
    Math.min(8, Math.floor(logicalCpuCount / 2)),
  );
  const concurrency =
    requestedConcurrency ?? profiledConcurrency ?? fallbackConcurrency;
  const requestedParallelRenders = parsePositiveInteger(
    'ANIMATION_PARALLEL_RENDERS',
    env.ANIMATION_PARALLEL_RENDERS,
  );
  const profiledParallelRenders = positiveInteger(
    startupProfile?.runtimePlan?.remotion?.parallelRenders,
  );
  const fallbackParallelRenders =
    logicalCpuCount >= 16 && totalMemoryGb >= 24 ? 2 : 1;
  const parallelRenders =
    requestedParallelRenders ??
    profiledParallelRenders ??
    fallbackParallelRenders;
  const requestedOllamaReviewConcurrency = parsePositiveInteger(
    'ANIMATION_OLLAMA_REVIEW_CONCURRENCY',
    env.ANIMATION_OLLAMA_REVIEW_CONCURRENCY,
  );
  const profiledOllamaReviewConcurrency = positiveInteger(
    startupProfile?.runtimePlan?.ai?.ollamaReviewConcurrency,
  );
  const ollamaReviewConcurrency =
    requestedOllamaReviewConcurrency ?? profiledOllamaReviewConcurrency ?? 1;
  const profiledHardwareAcceleration =
    startupProfile?.runtimePlan?.remotion?.hardwareAcceleration;
  const hardwareAcceleration =
    env.ANIMATION_HARDWARE_ACCELERATION === 'disable'
      ? 'disable'
      : profiledHardwareAcceleration ?? 'if-possible';
  const configuredGl = env.ANIMATION_REMOTION_GL?.trim();
  const profiledGl = startupProfile?.runtimePlan?.remotion?.gl;
  const gl = isSupportedGl(configuredGl)
    ? configuredGl
    : isSupportedGl(profiledGl)
      ? profiledGl
      : platform() === 'win32'
        ? 'angle'
        : undefined;
  const source =
    requestedConcurrency ||
    requestedParallelRenders ||
    requestedOllamaReviewConcurrency
      ? 'environment'
      : profiledConcurrency ||
          profiledParallelRenders ||
          profiledOllamaReviewConcurrency
        ? 'startup-profile'
        : 'fallback';

  return {
    logicalCpuCount,
    totalMemoryGb,
    concurrency,
    parallelRenders,
    ollamaReviewConcurrency,
    hardwareAcceleration,
    gl,
    source,
  };
}

export function loadStartupHardwareProfile(
  env: NodeJS.ProcessEnv = process.env,
): StartupHardwareProfile | undefined {
  const profilePath = resolve(
    env.SRF_HARDWARE_PROFILE_PATH ?? 'tmp/runtime/hardware-profile.json',
  );
  try {
    const parsed = JSON.parse(readFileSync(profilePath, 'utf8')) as StartupHardwareProfile;
    if (parsed.schemaVersion !== 1) return undefined;
    if (parsed.host && parsed.host !== hostname()) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

export function remotionPerformanceArgs(
  profile = getLocalRenderProfile(),
): string[] {
  const args = [
    `--concurrency=${profile.concurrency}`,
    `--hardware-acceleration=${profile.hardwareAcceleration}`,
  ];
  if (profile.gl) args.push(`--gl=${profile.gl}`);
  return args;
}

export function formatLocalRenderProfile(profile = getLocalRenderProfile()): string {
  const gl = profile.gl ? `, GL ${profile.gl}` : '';
  const source = profile.source ? `, source ${profile.source}` : '';
  return `${profile.logicalCpuCount} logical CPUs, ${profile.totalMemoryGb} GB RAM, concurrency ${profile.concurrency}, parallel renders ${profile.parallelRenders}, Ollama reviews ${profile.ollamaReviewConcurrency}, hardware ${profile.hardwareAcceleration}${gl}${source}`;
}

function parsePositiveInteger(
  name: string,
  value: string | undefined,
): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer, received ${value}.`);
  }
  return parsed;
}

function positiveInteger(value: number | undefined): number | undefined {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : undefined;
}

function isSupportedGl(
  value: string | undefined,
): value is NonNullable<LocalRenderProfile['gl']> {
  return (
    value === 'angle' ||
    value === 'egl' ||
    value === 'swiftshader' ||
    value === 'swangle' ||
    value === 'vulkan' ||
    value === 'angle-egl'
  );
}
