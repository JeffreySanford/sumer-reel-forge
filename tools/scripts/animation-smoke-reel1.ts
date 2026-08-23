import 'dotenv/config';
import { spawn } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { loadRendererConfig } from '../renderer/renderer-config.mjs';
import {
  formatLocalRenderProfile,
  getLocalRenderProfile,
} from '../animation/src/local-render-profile';

interface StepResult {
  name: string;
  durationMs: number;
}

interface ProbeResult {
  label: string;
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  pixelFormat?: string;
  fileSizeBytes: number;
}

interface AiReviewResult {
  label: string;
  model: string;
  status: 'completed' | 'skipped' | 'failed';
  outputPath?: string;
  review?: unknown;
  error?: string;
}

async function main(): Promise<void> {
  const root = resolve('.');
  const rendererConfig = loadRendererConfig();
  const profile = getLocalRenderProfile();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputRoot = resolve(
    process.env.ANIMATION_SMOKE_OUTPUT_DIRECTORY ??
      `tmp/renders/smoke-reel1/${stamp}`,
  );
  const shot3Directory = join(outputRoot, 'shot3');
  const shot4Directory = join(outputRoot, 'shot4');
  const handoffDirectory = join(outputRoot, 'shot3-to-4');
  const aiDirectory = join(outputRoot, 'ai-review');
  await Promise.all([
    mkdir(shot3Directory, { recursive: true }),
    mkdir(shot4Directory, { recursive: true }),
    mkdir(handoffDirectory, { recursive: true }),
    mkdir(aiDirectory, { recursive: true }),
  ]);

  console.log('Reel 1 animation smoke');
  console.log(`Hardware: ${formatLocalRenderProfile(profile)}`);
  console.log(
    profile.parallelRenders >= 2
      ? 'Shot 3 and Shot 4 render in parallel using the detected workstation budget.'
      : 'Shot 3 and Shot 4 render sequentially to protect the detected machine budget.',
  );
  console.log(`Output: ${outputRoot}`);
  console.log('');

  const steps: StepResult[] = [];
  steps.push(
    await runStep('Scene V2 policy + asset tests', 'pnpm', ['scene-v2:test'], root),
  );
  steps.push(
    await runStep(
      'Animation asset readiness',
      'pnpm',
      ['animation-assets:status'],
      root,
    ),
  );

  const renderEnv = {
    ...process.env,
    ANIMATION_RENDER_CONCURRENCY: String(profile.concurrency),
    ANIMATION_PARALLEL_RENDERS: String(profile.parallelRenders),
    ANIMATION_OLLAMA_REVIEW_CONCURRENCY: String(
      profile.ollamaReviewConcurrency,
    ),
    ANIMATION_HARDWARE_ACCELERATION: profile.hardwareAcceleration,
    ...(profile.gl ? { ANIMATION_REMOTION_GL: profile.gl } : {}),
  };

  const shotPairStartedAt = Date.now();
  let shot3Step: StepResult;
  let shot4Step: StepResult;
  if (profile.parallelRenders >= 2) {
    [shot3Step, shot4Step] = await Promise.all([
      runStep(
        'Shot 3 benchmark',
        'pnpm',
        ['render:animation:shot3-benchmark'],
        root,
        {
          ...renderEnv,
          SCENE_V2_BENCHMARK_OUTPUT_DIRECTORY: shot3Directory,
        },
      ),
      runStep(
        'Shot 4 benchmark',
        'pnpm',
        ['render:animation:shot4-benchmark'],
        root,
        {
          ...renderEnv,
          SCENE_V2_BENCHMARK_OUTPUT_DIRECTORY: shot4Directory,
        },
      ),
    ]);
  } else {
    shot3Step = await runStep(
      'Shot 3 benchmark',
      'pnpm',
      ['render:animation:shot3-benchmark'],
      root,
      {
        ...renderEnv,
        SCENE_V2_BENCHMARK_OUTPUT_DIRECTORY: shot3Directory,
      },
    );
    shot4Step = await runStep(
      'Shot 4 benchmark',
      'pnpm',
      ['render:animation:shot4-benchmark'],
      root,
      {
        ...renderEnv,
        SCENE_V2_BENCHMARK_OUTPUT_DIRECTORY: shot4Directory,
      },
    );
  }
  steps.push(shot3Step, shot4Step);
  const shotPairWallMs = Date.now() - shotPairStartedAt;

  const shot3ContactSheet = join(
    shot3Directory,
    'shot3-scene-v2-benchmark-contact-sheet.png',
  );
  const shot4ContactSheet = join(
    shot4Directory,
    'shot4-scene-v2-benchmark-contact-sheet.png',
  );

  const aiEnabled = process.env.ANIMATION_SMOKE_AI_REVIEW !== '0';
  const requireOllama = process.env.ANIMATION_SMOKE_REQUIRE_OLLAMA === '1';
  const runInitialAiReviews = async (): Promise<AiReviewResult[]> => {
    if (!aiEnabled) {
      return [
        { label: 'shot3', model: '', status: 'skipped' },
        { label: 'shot4', model: '', status: 'skipped' },
      ];
    }
    const tasks = [
      () =>
        reviewContactSheet(
          'shot3',
          shot3ContactSheet,
          join(aiDirectory, 'shot3-review.json'),
          requireOllama,
        ),
      () =>
        reviewContactSheet(
          'shot4',
          shot4ContactSheet,
          join(aiDirectory, 'shot4-review.json'),
          requireOllama,
        ),
    ];
    return runWithConcurrency(tasks, profile.ollamaReviewConcurrency);
  };

  const runHandoff = () =>
    runStep(
      'Shot 3 → 4 water handoff',
      'pnpm',
      ['render:animation:shot3-to-4-handoff'],
      root,
      {
        ...renderEnv,
        WATER_HANDOFF_BENCHMARK_OUTPUT_DIRECTORY: handoffDirectory,
      },
    );

  let handoffStep: StepResult;
  let initialAiReviews: AiReviewResult[];
  const overlapHandoffAndAi =
    profile.parallelRenders >= 2 || profile.ollamaReviewConcurrency >= 2;
  if (overlapHandoffAndAi) {
    [handoffStep, initialAiReviews] = await Promise.all([
      runHandoff(),
      runInitialAiReviews(),
    ]);
  } else {
    handoffStep = await runHandoff();
    initialAiReviews = await runInitialAiReviews();
  }
  steps.push(handoffStep);

  const handoffContactSheet = join(
    handoffDirectory,
    'shot3-to-shot4-water-handoff-contact-sheet.png',
  );
  const handoffAiReview = aiEnabled
    ? await reviewContactSheet(
        'shot3-to-4-handoff',
        handoffContactSheet,
        join(aiDirectory, 'shot3-to-4-handoff-review.json'),
        requireOllama,
      )
    : {
        label: 'shot3-to-4-handoff',
        model: '',
        status: 'skipped' as const,
      };
  const aiReviews = [...initialAiReviews, handoffAiReview];

  const probes = await Promise.all([
    probeVideo(
      'shot3',
      join(shot3Directory, 'shot3-scene-v2-benchmark.mp4'),
      rendererConfig.ffprobeCommand,
      root,
    ),
    probeVideo(
      'shot4',
      join(shot4Directory, 'shot4-scene-v2-benchmark.mp4'),
      rendererConfig.ffprobeCommand,
      root,
    ),
    probeVideo(
      'shot3-to-4-handoff',
      join(handoffDirectory, 'shot3-to-shot4-water-handoff-benchmark.mp4'),
      rendererConfig.ffprobeCommand,
      root,
    ),
  ]);

  assertProbe(probes[0], 1080, 1920, 30, 7, 0.35);
  assertProbe(probes[1], 1080, 1920, 30, 8, 0.35);
  assertProbe(probes[2], 1080, 1920, 30, 15, 0.5);
  await Promise.all([
    assertNonEmptyFile(shot3ContactSheet),
    assertNonEmptyFile(shot4ContactSheet),
    assertNonEmptyFile(handoffContactSheet),
  ]);

  const summary = {
    schemaVersion: 1,
    smokeType: 'reel-1-animation',
    generatedAt: new Date().toISOString(),
    outputRoot,
    renderProfile: profile,
    shotPairMode: profile.parallelRenders >= 2 ? 'parallel' : 'sequential',
    shotPairWallMs,
    parallelRenderWallMs: shotPairWallMs,
    steps,
    probes,
    aiReviews,
    passed: true,
  };
  const summaryPath = join(outputRoot, 'smoke-summary.json');
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  console.log('');
  console.log('PASS — Reel 1 animation smoke completed.');
  console.log(
    `${profile.parallelRenders >= 2 ? 'Parallel' : 'Sequential'} Shot 3 + 4 wall time: ${(shotPairWallMs / 1000).toFixed(1)}s`,
  );
  for (const probe of probes) {
    console.log(
      `${probe.label}: ${probe.width}x${probe.height} @ ${probe.fps.toFixed(2)}fps, ${probe.durationSeconds.toFixed(2)}s`,
    );
  }
  for (const review of aiReviews) {
    console.log(
      `Ollama ${review.label}: ${review.status}${review.model ? ` (${review.model})` : ''}`,
    );
  }
  console.log(`Summary: ${summaryPath}`);
}

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  let nextIndex = 0;
  const workerCount = Math.max(1, Math.min(concurrency, tasks.length));
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= tasks.length) return;
      results[index] = await tasks[index]();
    }
  });
  await Promise.all(workers);
  return results;
}

async function runStep(
  name: string,
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<StepResult> {
  const startedAt = Date.now();
  console.log(`\n[smoke] ${name}`);
  await run(command, args, cwd, env);
  const durationMs = Date.now() - startedAt;
  console.log(`[smoke] ${name} completed in ${(durationMs / 1000).toFixed(1)}s`);
  return { name, durationMs };
}

async function reviewContactSheet(
  label: string,
  imagePath: string,
  outputPath: string,
  required: boolean,
): Promise<AiReviewResult> {
  const baseUrl = (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '');
  const model = process.env.OLLAMA_VISION_MODEL ?? 'qwen3-vl:4b-instruct';
  try {
    const image = await readFile(imagePath);
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        think: false,
        keep_alive: '10m',
        format: 'json',
        options: { temperature: 0.1 },
        messages: [
          {
            role: 'user',
            content:
              'You are an advisory visual reviewer for a cinematic mythological documentary. Review this five-frame contact sheet for continuity and restrained cinematic motion. Do not rewrite story content. Return JSON with keys result (PASS, REVIEW, or FAIL), strengths (array), concerns (array), composition, continuity, motion_read, identity_or_world_drift, and recommendation. Be conservative: human approval remains required.',
            images: [image.toString('base64')],
          },
        ],
      }),
      signal: AbortSignal.timeout(
        Number(process.env.PLANNING_TIMEOUT_MS ?? 120_000),
      ),
    });
    if (!response.ok) {
      throw new Error(`Ollama returned HTTP ${response.status}: ${await response.text()}`);
    }
    const payload = (await response.json()) as {
      message?: { content?: string };
      model?: string;
    };
    const raw = payload.message?.content?.trim() ?? '';
    let review: unknown = raw;
    try {
      review = JSON.parse(raw);
    } catch {
      // Keep raw model output if it is not strict JSON.
    }
    const result: AiReviewResult = {
      label,
      model: payload.model ?? model,
      status: 'completed',
      outputPath,
      review,
    };
    await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (required) throw new Error(`Ollama review ${label} failed: ${message}`);
    console.warn(`[smoke] Ollama review ${label} skipped: ${message}`);
    return { label, model, status: 'failed', error: message };
  }
}

async function probeVideo(
  label: string,
  path: string,
  ffprobeCommand: string,
  cwd: string,
): Promise<ProbeResult> {
  await assertNonEmptyFile(path);
  const output = await capture(
    ffprobeCommand,
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height,r_frame_rate,pix_fmt:format=duration',
      '-of',
      'json',
      path,
    ],
    cwd,
  );
  const parsed = JSON.parse(output) as {
    streams?: Array<{
      width?: number;
      height?: number;
      r_frame_rate?: string;
      pix_fmt?: string;
    }>;
    format?: { duration?: string };
  };
  const stream = parsed.streams?.[0];
  if (!stream?.width || !stream.height || !stream.r_frame_rate) {
    throw new Error(`ffprobe did not return a valid video stream for ${path}.`);
  }
  const file = await stat(path);
  return {
    label,
    width: stream.width,
    height: stream.height,
    fps: parseRate(stream.r_frame_rate),
    durationSeconds: Number(parsed.format?.duration ?? 0),
    pixelFormat: stream.pix_fmt,
    fileSizeBytes: file.size,
  };
}

function assertProbe(
  probe: ProbeResult,
  width: number,
  height: number,
  fps: number,
  durationSeconds: number,
  toleranceSeconds: number,
): void {
  if (probe.width !== width || probe.height !== height) {
    throw new Error(
      `${probe.label} dimensions ${probe.width}x${probe.height} do not match ${width}x${height}.`,
    );
  }
  if (Math.abs(probe.fps - fps) > 0.01) {
    throw new Error(`${probe.label} fps ${probe.fps} does not match ${fps}.`);
  }
  if (Math.abs(probe.durationSeconds - durationSeconds) > toleranceSeconds) {
    throw new Error(
      `${probe.label} duration ${probe.durationSeconds}s is outside expected ${durationSeconds}s ± ${toleranceSeconds}s.`,
    );
  }
}

async function assertNonEmptyFile(path: string): Promise<void> {
  const file = await stat(path);
  if (!file.isFile() || file.size <= 0) {
    throw new Error(`Expected non-empty file: ${path}`);
  }
}

function parseRate(value: string): number {
  const [numerator, denominator = '1'] = value.split('/');
  const n = Number(numerator);
  const d = Number(denominator);
  return d ? n / d : 0;
}

function run(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      env,
      shell: process.platform === 'win32',
      stdio: 'inherit',
      windowsHide: true,
    });
    child.once('error', rejectPromise);
    child.once('exit', (code, signal) => {
      if (code === 0) return resolvePromise();
      rejectPromise(
        new Error(
          `${command} ${args.join(' ')} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}.`,
        ),
      );
    });
  });
}

function capture(command: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.once('error', rejectPromise);
    child.once('exit', (code, signal) => {
      if (code === 0) return resolvePromise(stdout);
      rejectPromise(
        new Error(
          `${command} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}: ${stderr}`,
        ),
      );
    });
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
