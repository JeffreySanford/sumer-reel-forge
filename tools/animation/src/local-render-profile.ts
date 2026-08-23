import { cpus, platform, totalmem } from 'node:os';

export interface LocalRenderProfile {
  logicalCpuCount: number;
  totalMemoryGb: number;
  concurrency: number;
  hardwareAcceleration: 'if-possible' | 'disable';
  gl?: 'angle' | 'egl' | 'swiftshader' | 'swangle' | 'vulkan' | 'angle-egl';
}

export function getLocalRenderProfile(
  env: NodeJS.ProcessEnv = process.env,
): LocalRenderProfile {
  const logicalCpuCount = Math.max(1, cpus().length);
  const totalMemoryGb = Math.round((totalmem() / 1024 ** 3) * 10) / 10;
  const requestedConcurrency = parsePositiveInteger(
    env.ANIMATION_RENDER_CONCURRENCY,
  );
  const defaultConcurrency = Math.max(
    2,
    Math.min(8, Math.floor(logicalCpuCount / 2)),
  );
  const hardwareAcceleration =
    env.ANIMATION_HARDWARE_ACCELERATION === 'disable'
      ? 'disable'
      : 'if-possible';
  const configuredGl = env.ANIMATION_REMOTION_GL?.trim();
  const gl = isSupportedGl(configuredGl)
    ? configuredGl
    : platform() === 'win32'
      ? 'angle'
      : undefined;

  return {
    logicalCpuCount,
    totalMemoryGb,
    concurrency: requestedConcurrency ?? defaultConcurrency,
    hardwareAcceleration,
    gl,
  };
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
  return `${profile.logicalCpuCount} logical CPUs, ${profile.totalMemoryGb} GB RAM, concurrency ${profile.concurrency}, hardware ${profile.hardwareAcceleration}${gl}`;
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `ANIMATION_RENDER_CONCURRENCY must be a positive integer, received ${value}.`,
    );
  }
  return parsed;
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
