import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import type { RenderForgeShot01WaterAuditionDto } from './forge-shot01-water-audition.dto';

export const FORGE_SHOT01_WATER_CHANNELS = [
  'horizontalCurrent',
  'verticalRipple',
  'flowSpeed',
  'rippleScale',
] as const;

type ForgeShot01WaterChannel = (typeof FORGE_SHOT01_WATER_CHANNELS)[number];

export type ForgeShot01WaterParameters = Record<
  ForgeShot01WaterChannel,
  number
>;

export interface ForgeShot01WaterAudition {
  schemaVersion: 1;
  id: string;
  state: 'rendered-non-canonical-audition';
  sourceShotNumber: 1;
  createdAt: string;
  parameters: ForgeShot01WaterParameters;
  scenePath: string;
  videoPath: string;
  videoUrl: string;
  guardrails: string[];
}

const SOURCE_SCENE =
  'tools/animation/scenes/reel-01-shot-01-black-water-level2.scene-v2.json';
const SOURCE_ASSET =
  'blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-01.png';
const OUTPUT_VIDEO = 'shot1-scene-v2-benchmark.mp4';

@Injectable()
export class ForgeShot01WaterAuditionService {
  async render(
    dto: RenderForgeShot01WaterAuditionDto,
  ): Promise<ForgeShot01WaterAudition> {
    const parameters = normalizeShot01WaterParameters(dto.parameters);
    const root = await findWorkspaceRoot(process.cwd());
    const sourceScenePath = resolve(root, SOURCE_SCENE);
    const sourceScene = JSON.parse(
      await readFile(sourceScenePath, 'utf8'),
    ) as unknown;

    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const outputDirectory = resolve(
      root,
      'tmp',
      'forge-water-auditions',
      id,
    );
    const scenePath = resolve(outputDirectory, 'shot01-water-audition.scene-v2.json');
    const videoPath = resolve(outputDirectory, OUTPUT_VIDEO);
    assertInside(
      resolve(root, 'tmp', 'forge-water-auditions'),
      outputDirectory,
      'Forge Shot 1 water audition output',
    );

    const auditionScene = buildShot01WaterAuditionScene(
      sourceScene,
      parameters,
      id,
    );

    await mkdir(outputDirectory, { recursive: true });
    await writeFile(
      scenePath,
      `${JSON.stringify(auditionScene, null, 2)}\n`,
      'utf8',
    );

    await run(
      'pnpm',
      [
        'exec',
        'tsx',
        'tools/scripts/render-scene-v2-benchmark.ts',
        scenePath,
      ],
      root,
      {
        SCENE_V2_BENCHMARK_OUTPUT_DIRECTORY: outputDirectory,
      },
    );
    await access(videoPath);

    return {
      schemaVersion: 1,
      id,
      state: 'rendered-non-canonical-audition',
      sourceShotNumber: 1,
      createdAt,
      parameters,
      scenePath: relative(root, scenePath).replace(/\\/g, '/'),
      videoPath: relative(root, videoPath).replace(/\\/g, '/'),
      videoUrl: `/api/forge/shot-1-water-auditions/${id}/video?rendered=${encodeURIComponent(createdAt)}`,
      guardrails: [
        'The approved editorial source remains the only image asset used by this audition.',
        'The generated Scene V2 file and rendered media live only under tmp/forge-water-auditions/.',
        'No animation-v1 manifest, asset, approval, production job, or canonical scene is modified.',
        'Human normal-speed review remains required before any promotion decision.',
      ],
    };
  }

  async getSource(): Promise<{ filePath: string; filename: string }> {
    const root = await findWorkspaceRoot(process.cwd());
    const assetRoot = resolve(root, 'assets');
    const filePath = resolve(assetRoot, SOURCE_ASSET);
    assertInside(assetRoot, filePath, 'Forge Shot 1 approved source');
    try {
      await access(filePath);
    } catch {
      throw new NotFoundException('The approved Shot 1 editorial source was not found.');
    }
    return { filePath, filename: 'shot01-editorial-source.png' };
  }

  async getVideo(id: string): Promise<{ filePath: string; filename: string }> {
    assertAuditionId(id);
    const root = await findWorkspaceRoot(process.cwd());
    const auditionRoot = resolve(root, 'tmp', 'forge-water-auditions');
    const filePath = resolve(auditionRoot, id, OUTPUT_VIDEO);
    assertInside(auditionRoot, filePath, 'Forge Shot 1 water audition video');
    try {
      await access(filePath);
    } catch {
      throw new NotFoundException(`Shot 1 water audition '${id}' was not found.`);
    }
    return { filePath, filename: `shot01-water-audition-${id}.mp4` };
  }
}

export function normalizeShot01WaterParameters(
  value: unknown,
): ForgeShot01WaterParameters {
  if (!isRecord(value)) {
    throw new BadRequestException('Shot 1 water audition parameters must be an object.');
  }

  const keys = Object.keys(value);
  const unknown = keys.filter(
    (key) => !FORGE_SHOT01_WATER_CHANNELS.includes(key as ForgeShot01WaterChannel),
  );
  const missing = FORGE_SHOT01_WATER_CHANNELS.filter(
    (key) => !Object.prototype.hasOwnProperty.call(value, key),
  );
  if (unknown.length || missing.length || keys.length !== FORGE_SHOT01_WATER_CHANNELS.length) {
    throw new BadRequestException(
      `Shot 1 water audition requires exactly these channels: ${FORGE_SHOT01_WATER_CHANNELS.join(', ')}.`,
    );
  }

  return Object.fromEntries(
    FORGE_SHOT01_WATER_CHANNELS.map((key) => {
      const raw = value[key];
      if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0 || raw > 1) {
        throw new BadRequestException(
          `Shot 1 water audition parameter '${key}' must be a number from 0 through 1.`,
        );
      }
      return [key, raw];
    }),
  ) as ForgeShot01WaterParameters;
}

export function buildShot01WaterAuditionScene(
  value: unknown,
  parameters: ForgeShot01WaterParameters,
  auditionId: string,
): Record<string, unknown> {
  if (!isRecord(value) || !Array.isArray(value.shots)) {
    throw new BadRequestException('Shot 1 water audition source scene is invalid.');
  }

  const clone = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  const shots = clone.shots;
  if (!Array.isArray(shots) || shots.length !== 1 || !isRecord(shots[0])) {
    throw new BadRequestException(
      'Shot 1 water audition source must contain exactly one shot.',
    );
  }
  const shot = shots[0];
  if (shot.sourceShotNumber !== 1) {
    throw new BadRequestException(
      'Shot 1 water audition source scene must target sourceShotNumber 1.',
    );
  }
  if (!Array.isArray(shot.layers) || shot.layers.length !== 1) {
    throw new BadRequestException(
      'Shot 1 water audition requires the conservative single-source editorial layer.',
    );
  }
  if (!isRecord(clone.sourcePolicy) || clone.sourcePolicy.storyMutationAllowed !== false) {
    throw new BadRequestException(
      'Shot 1 water audition source policy must forbid story mutation.',
    );
  }
  if (!isRecord(clone.reviewPolicy) || clone.reviewPolicy.humanApprovalRequired !== true) {
    throw new BadRequestException(
      'Shot 1 water audition source scene must require human approval.',
    );
  }

  clone.sceneId = `chapter-01-reel-01-shot-01-forge-water-audition-${auditionId}`;
  shot.waterSurface = {
    enabled: true,
    horizontalCurrent: parameters.horizontalCurrent,
    verticalRipple: parameters.verticalRipple,
    flowSpeed: parameters.flowSpeed,
    rippleScale: parameters.rippleScale,
  };

  return clone;
}

async function findWorkspaceRoot(start: string): Promise<string> {
  let current = resolve(start);
  while (true) {
    if (
      existsSync(resolve(current, 'nx.json')) &&
      existsSync(resolve(current, 'package.json'))
    ) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      throw new Error('Unable to locate Sumer Reel Forge workspace root.');
    }
    current = parent;
  }
}

function assertAuditionId(id: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new BadRequestException('Invalid Shot 1 water audition id.');
  }
}

function assertInside(root: string, candidate: string, label: string): void {
  const rel = relative(root, candidate);
  if (!rel || rel === '.') return;
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`${label} escaped its allowed root.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function run(
  command: string,
  args: string[],
  cwd: string,
  extraEnv: Record<string, string>,
): Promise<void> {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...extraEnv },
      shell: process.platform === 'win32',
      stdio: 'inherit',
      windowsHide: true,
    });
    child.once('error', rejectPromise);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(
        new Error(
          `${command} failed with ${signal ? `signal ${signal}` : `exit code ${code ?? 'unknown'}`}.`,
        ),
      );
    });
  });
}
