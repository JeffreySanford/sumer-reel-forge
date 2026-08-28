import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as childProcess from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type {
  LocalAiModelDescriptor,
  LocalAiProvider,
  LocalAiProviderCapability,
  ManagedChatRequest,
  ManagedChatResult,
} from './local-ai.provider';

interface OllamaTagsResponse {
  models?: Array<{ name?: string; model?: string }>;
}

interface OllamaChatResponse {
  message?: { content?: string };
  model?: string;
}

const MANAGED_OLLAMA_BRIDGE = 'tools/scripts/managed-ollama-chat-bridge.mjs';
const DEFAULT_INFERENCE_TIMEOUT_MS = 120_000;
const DEFAULT_UNLOAD_TIMEOUT_MS = 120_000;
const BRIDGE_WATCHDOG_MARGIN_MS = 5_000;

@Injectable()
export class OllamaLocalAiProvider implements LocalAiProvider {
  readonly id = 'ollama' as const;

  private readonly baseUrl = (
    process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
  ).replace(/\/$/, '');
  private readonly textModel = process.env.OLLAMA_TEXT_MODEL;
  private readonly visionModel = process.env.OLLAMA_VISION_MODEL;

  async getCapability(): Promise<LocalAiProviderCapability> {
    try {
      await this.fetchModelNames();
      return {
        id: this.id,
        available: true,
        baseUrl: this.baseUrl,
        configuredModel: this.textModel,
        configuredVisionModel: this.visionModel,
        text: Boolean(this.textModel),
        vision: Boolean(this.visionModel),
        structuredOutput: true,
        modelInventory: true,
        managedUnload: true,
        managedStartup: false,
        openAiCompatible: false,
        detail: this.textModel
          ? 'Local Ollama is reachable and participates in managed GPU ownership.'
          : 'Local Ollama is reachable. Set OLLAMA_TEXT_MODEL to enable managed text inference.',
      };
    } catch (error) {
      return {
        id: this.id,
        available: false,
        baseUrl: this.baseUrl,
        configuredModel: this.textModel,
        configuredVisionModel: this.visionModel,
        text: false,
        vision: false,
        structuredOutput: true,
        modelInventory: true,
        managedUnload: true,
        managedStartup: false,
        openAiCompatible: false,
        detail: `Ollama is not reachable at ${this.baseUrl}: ${errorMessage(error)}`,
      };
    }
  }

  async listModels(): Promise<LocalAiModelDescriptor[]> {
    const names = await this.fetchModelNames();
    return names.map((id) => ({
      id,
      provider: this.id,
      configuredFor: [
        ...(id === this.textModel ? (['text'] as const) : []),
        ...(id === this.visionModel ? (['vision'] as const) : []),
      ],
    }));
  }

  async chat(request: ManagedChatRequest): Promise<ManagedChatResult> {
    const timeoutMs = positiveInteger(
      request.timeoutMs,
      positiveInteger(process.env.PLANNING_TIMEOUT_MS, DEFAULT_INFERENCE_TIMEOUT_MS),
    );
    const leaseTimeoutMs = positiveInteger(
      request.leaseTimeoutMs,
      positiveInteger(process.env.SRF_GPU_LEASE_TIMEOUT_MS, timeoutMs),
    );
    const unloadTimeoutMs = positiveInteger(
      request.unloadTimeoutMs,
      positiveInteger(process.env.OLLAMA_UNLOAD_TIMEOUT_MS, DEFAULT_UNLOAD_TIMEOUT_MS),
    );
    const keepAlive = request.keepAlive ?? process.env.OLLAMA_KEEP_ALIVE ?? '10m';

    const response = await runManagedOllamaBridge({
      ...request,
      baseUrl: this.baseUrl,
      timeoutMs,
      leaseTimeoutMs,
      unloadTimeoutMs,
      keepAlive,
      errorPrefix: request.errorPrefix ?? 'Managed Ollama chat',
    });
    const content = response.message?.content;
    if (!content) {
      throw new Error('Ollama returned no message content.');
    }

    return {
      provider: this.id,
      model: response.model ?? request.model,
      content,
    };
  }

  private async fetchModelNames(): Promise<string[]> {
    const response = await axios.get<OllamaTagsResponse>(`${this.baseUrl}/api/tags`, {
      timeout: 5_000,
    });
    return (response.data.models ?? [])
      .map((model) => model.name ?? model.model)
      .filter((name): name is string => Boolean(name));
  }
}

async function runManagedOllamaBridge(
  request: ManagedChatRequest & {
    baseUrl: string;
    timeoutMs: number;
    leaseTimeoutMs: number;
    unloadTimeoutMs: number;
    keepAlive: string;
    errorPrefix: string;
  },
): Promise<OllamaChatResponse> {
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
        resolvePromise(JSON.parse(Buffer.concat(stdout).toString('utf8')));
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

function positiveInteger(
  value: number | string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
