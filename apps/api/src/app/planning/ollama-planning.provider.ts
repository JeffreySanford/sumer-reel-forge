import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import * as childProcess from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type {
  PlanningProvider,
  PlanningProviderCapability,
  ShotPlanProposal,
  ShotPlanningInput,
} from './planning-provider';

interface OllamaTagsResponse {
  models?: Array<{ name?: string; model?: string }>;
}

interface OllamaChatResponse {
  message?: { content?: string };
  model?: string;
}

const MAX_DEFAULT_CAMERA_SCALE_DELTA = 0.05;
const MANAGED_OLLAMA_BRIDGE = 'tools/scripts/managed-ollama-chat-bridge.mjs';
const DEFAULT_UNLOAD_TIMEOUT_MS = 120_000;
const BRIDGE_WATCHDOG_MARGIN_MS = 5_000;

const SHOT_PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'eyeTarget',
    'stillnessAnchor',
    'camera',
    'motionBudget',
    'requiredAssets',
    'inheritedStyleRules',
    'unresolvedQuestions',
    'rationale',
  ],
  properties: {
    eyeTarget: { type: 'string' },
    stillnessAnchor: { type: 'string' },
    camera: {
      type: 'object',
      additionalProperties: false,
      required: ['preset', 'scaleFrom', 'scaleTo', 'easing'],
      properties: {
        preset: { type: 'string' },
        scaleFrom: { type: 'number' },
        scaleTo: { type: 'number' },
        easing: { type: 'string' },
      },
    },
    motionBudget: {
      type: 'object',
      additionalProperties: false,
      required: ['primary', 'subject', 'environment', 'lighting'],
      properties: {
        primary: { type: 'string' },
        subject: { type: 'string' },
        environment: { type: 'array', items: { type: 'string' } },
        lighting: { type: 'string' },
      },
    },
    requiredAssets: { type: 'array', items: { type: 'string' } },
    inheritedStyleRules: { type: 'array', items: { type: 'string' } },
    unresolvedQuestions: { type: 'array', items: { type: 'string' } },
    rationale: { type: 'string' },
  },
} as const;

@Injectable()
export class OllamaPlanningProvider implements PlanningProvider {
  readonly id = 'ollama' as const;

  private readonly baseUrl = (
    process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
  ).replace(/\/$/, '');

  private readonly textModel = process.env.OLLAMA_TEXT_MODEL;
  private readonly visionModel = process.env.OLLAMA_VISION_MODEL;
  private readonly timeoutMs = positiveInteger(
    process.env.PLANNING_TIMEOUT_MS,
    120_000,
  );
  private readonly leaseTimeoutMs = positiveInteger(
    process.env.SRF_GPU_LEASE_TIMEOUT_MS,
    this.timeoutMs,
  );
  private readonly unloadTimeoutMs = positiveInteger(
    process.env.OLLAMA_UNLOAD_TIMEOUT_MS,
    DEFAULT_UNLOAD_TIMEOUT_MS,
  );
  private readonly keepAlive = process.env.OLLAMA_KEEP_ALIVE ?? '10m';

  async getCapability(): Promise<PlanningProviderCapability> {
    try {
      const response = await axios.get<OllamaTagsResponse>(
        `${this.baseUrl}/api/tags`,
        { timeout: Math.min(this.timeoutMs, 5_000) },
      );
      const models = (response.data.models ?? [])
        .map((model) => model.name ?? model.model)
        .filter((name): name is string => Boolean(name));

      return {
        id: this.id,
        available: true,
        configuredModel: this.textModel,
        configuredVisionModel: this.visionModel,
        models,
        text: Boolean(this.textModel),
        vision: Boolean(this.visionModel),
        structuredOutput: true,
        detail: this.textModel
          ? 'Local Ollama is reachable and a text planning model is configured.'
          : 'Local Ollama is reachable. Set OLLAMA_TEXT_MODEL to enable AI planning.',
      };
    } catch (error) {
      return {
        id: this.id,
        available: false,
        configuredModel: this.textModel,
        configuredVisionModel: this.visionModel,
        text: false,
        vision: false,
        structuredOutput: true,
        detail: `Ollama is not reachable at ${this.baseUrl}: ${errorMessage(error)}`,
      };
    }
  }

  async proposeShotPlan(input: ShotPlanningInput): Promise<ShotPlanProposal> {
    if (!this.textModel) {
      throw new ServiceUnavailableException(
        'OLLAMA_TEXT_MODEL is required when the Ollama planning provider is selected.',
      );
    }

    const system = [
      'You are the local assistant director for Sumer Reel Forge.',
      'Return only data that conforms to the supplied JSON schema.',
      'The human remains the director and final approver.',
      'Do not rewrite source narration.',
      'Prefer restrained cinematic illustrated motion over spectacle.',
      'Use the fewest motion channels and assets needed to make the shot feel authored.',
      'Physical materials obey weight and inertia; supernatural motion may carefully depart from those rules.',
      'Treat inherited style rules as immutable constraints unless the input explicitly identifies a conflict for human review.',
    ].join(' ');

    const user = JSON.stringify(
      {
        task: 'Propose one shot direction package.',
        shot: input,
        limits: {
          typicalCameraScaleChangePercent: '0-5',
          onePrimaryMotion: true,
          humanApprovalRequired: true,
        },
      },
      null,
      2,
    );

    try {
      const response = await runManagedOllamaBridge({
        owner: 'api-ollama-planning',
        task: `shot-plan-proposal-${input.shotId}`,
        baseUrl: this.baseUrl,
        model: this.textModel,
        timeoutMs: this.timeoutMs,
        leaseTimeoutMs: this.leaseTimeoutMs,
        unloadTimeoutMs: this.unloadTimeoutMs,
        keepAlive: this.keepAlive,
        format: SHOT_PLAN_SCHEMA,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        options: { temperature: 0.2 },
        errorPrefix: 'Ollama shot planning',
      });

      const content = response.data.message?.content;
      if (!content) {
        throw new Error('Ollama returned no structured message content.');
      }

      const parsed = JSON.parse(content) as unknown;
      assertShotPlanShape(parsed);
      assertCameraScaleDelta(parsed.camera.scaleFrom, parsed.camera.scaleTo);

      return {
        ...parsed,
        inheritedStyleRules: [...input.styleRules],
        provider: this.id,
        model: response.data.model ?? this.textModel,
        shotId: input.shotId,
        status: 'proposal',
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException(
        `Ollama shot planning failed: ${errorMessage(error)}`,
      );
    }
  }
}

async function runManagedOllamaBridge(request: {
  owner: string;
  task: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  leaseTimeoutMs: number;
  unloadTimeoutMs: number;
  keepAlive: string;
  format: unknown;
  messages: Array<{ role: string; content: string }>;
  options: Record<string, unknown>;
  errorPrefix: string;
}): Promise<{ data: OllamaChatResponse }> {
  return await new Promise((resolvePromise, rejectPromise) => {
    const workspaceRoot = findWorkspaceRoot();
    const bridgePath = resolve(workspaceRoot, MANAGED_OLLAMA_BRIDGE);
    if (!existsSync(bridgePath)) {
      rejectPromise(new Error(`Managed Ollama bridge was not found at ${bridgePath}.`));
      return;
    }

    const child = childProcess.spawn(process.execPath, [bridgePath], {
      cwd: workspaceRoot,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let settled = false;
    const watchdogMs =
      request.leaseTimeoutMs +
      request.timeoutMs +
      request.unloadTimeoutMs +
      BRIDGE_WATCHDOG_MARGIN_MS;
    const timeout = setTimeout(() => {
      if (settled) return;
      child.kill();
      settled = true;
      rejectPromise(
        new Error(
          `Managed Ollama bridge timed out after ${watchdogMs}ms ` +
            `(lease ${request.leaseTimeoutMs}ms + inference ${request.timeoutMs}ms + cleanup ${request.unloadTimeoutMs}ms).`,
        ),
      );
    }, watchdogMs);
    timeout.unref?.();

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.once('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      rejectPromise(error);
    });
    child.once('close', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (signal) {
        rejectPromise(new Error(`Managed Ollama bridge exited with signal ${signal}.`));
        return;
      }
      const stderrText = Buffer.concat(stderr).toString('utf8').trim();
      if (code !== 0) {
        rejectPromise(
          new Error(
            `Managed Ollama bridge exited with code ${code ?? 'unknown'}${
              stderrText ? `: ${stderrText}` : ''
            }`,
          ),
        );
        return;
      }
      try {
        resolvePromise({
          data: JSON.parse(Buffer.concat(stdout).toString('utf8')),
        });
      } catch (error) {
        rejectPromise(
          new Error(
            `Managed Ollama bridge returned invalid JSON${
              stderrText ? `: ${stderrText}` : ''
            }: ${errorMessage(error)}`,
          ),
        );
      }
    });
    child.stdin.end(JSON.stringify(request));
  });
}

function findWorkspaceRoot(): string {
  const candidates = [process.cwd(), __dirname];
  for (const start of candidates) {
    let current = resolve(start);
    for (let depth = 0; depth < 8; depth += 1) {
      if (existsSync(resolve(current, MANAGED_OLLAMA_BRIDGE))) {
        return current;
      }
      const parent = dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  return resolve('.');
}

function assertShotPlanShape(
  value: unknown,
): asserts value is Omit<
  ShotPlanProposal,
  'provider' | 'model' | 'shotId' | 'status'
> {
  if (!isRecord(value)) {
    throw new Error('Structured response is not an object.');
  }
  if (
    !isNonEmptyString(value.eyeTarget) ||
    !isNonEmptyString(value.stillnessAnchor) ||
    !isRecord(value.camera) ||
    !isNonEmptyString(value.camera.preset) ||
    !isFiniteNumber(value.camera.scaleFrom) ||
    !isFiniteNumber(value.camera.scaleTo) ||
    !isNonEmptyString(value.camera.easing) ||
    !isRecord(value.motionBudget) ||
    !isNonEmptyString(value.motionBudget.primary) ||
    !isNonEmptyString(value.motionBudget.subject) ||
    !isStringArray(value.motionBudget.environment) ||
    !isNonEmptyString(value.motionBudget.lighting) ||
    !isStringArray(value.requiredAssets) ||
    !isStringArray(value.inheritedStyleRules) ||
    !isStringArray(value.unresolvedQuestions) ||
    !isNonEmptyString(value.rationale)
  ) {
    throw new Error('Structured response failed shot-plan validation.');
  }
}

function assertCameraScaleDelta(scaleFrom: number, scaleTo: number): void {
  if (scaleFrom <= 0 || scaleTo <= 0) {
    throw new Error('Camera scale values must be positive.');
  }

  if (Math.abs(scaleTo - scaleFrom) > MAX_DEFAULT_CAMERA_SCALE_DELTA) {
    throw new Error(
      `Camera scale delta exceeds the default ${MAX_DEFAULT_CAMERA_SCALE_DELTA * 100}% planning guardrail.`,
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
