#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  loadManagedOllamaModels,
  resolveManagedOllamaModels,
} from '../ollama/managed-models.mjs';

try {
  process.loadEnvFile?.();
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

const options = parseOptions(process.argv.slice(2));

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const manifest = await loadManagedOllamaModels(options.manifest);
  const selected = resolveManagedOllamaModels(manifest, process.env, {
    includeRetrieval: options.includeRetrieval,
  });
  const cli = spawnSync('ollama', ['--version'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (cli.error || cli.status !== 0) {
    throw new Error('Ollama CLI is not available on PATH.');
  }

  let inventory = await fetchInventory(options.baseUrl);
  const initialMissing = selected.filter(
    (entry) => !inventory.names.has(entry.selectedModel),
  );

  if (options.pullMissing && initialMissing.length > 0) {
    for (const entry of initialMissing) {
      console.log(`[ollama] pulling ${entry.selectedModel} for ${entry.role}`);
      const pull = spawnSync('ollama', ['pull', entry.selectedModel], {
        stdio: 'inherit',
        windowsHide: true,
      });
      if (pull.error || pull.status !== 0) {
        throw new Error(`ollama pull failed for ${entry.selectedModel}.`);
      }
    }
    inventory = await fetchInventory(options.baseUrl);
  }

  const missing = selected.filter(
    (entry) => !inventory.names.has(entry.selectedModel),
  );
  const state = {
    schemaVersion: 1,
    observedAt: new Date().toISOString(),
    ollamaVersion: `${cli.stdout ?? cli.stderr ?? ''}`.trim(),
    baseUrl: options.baseUrl,
    action: options.pullMissing ? 'pull-missing' : 'check',
    includeRetrieval: options.includeRetrieval,
    selected: selected.map((entry) => ({
      role: entry.role,
      tier: entry.tier,
      envVar: entry.envVar,
      model: entry.selectedModel,
      source: entry.source,
      installed: inventory.names.has(entry.selectedModel),
      workload: entry.workload,
      defaultKeepAlive: entry.defaultKeepAlive,
    })),
    installedModels: [...inventory.names].sort(),
    missingModels: missing.map((entry) => entry.selectedModel),
    policy: manifest.policy,
  };
  await writeJson(options.state, state);

  console.log('Managed Ollama model check');
  for (const entry of state.selected) {
    console.log(
      `${entry.installed ? 'READY' : 'MISSING'} · ${entry.role} · ${entry.model} · ${entry.source}`,
    );
  }
  console.log(`State: ${resolve(options.state)}`);
  console.log('[POLICY] Setup never starts models and never changes human approval authority.');

  if (missing.length > 0) {
    if (!options.pullMissing) {
      console.error(
        `[STOP] ${missing.length} managed model(s) missing. Re-run with --pull-missing to install explicitly.`,
      );
    }
    process.exitCode = 2;
  }
}

async function fetchInventory(baseUrl) {
  const response = await fetch(`${baseUrl}/api/tags`, {
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) {
    throw new Error(`Ollama /api/tags returned HTTP ${response.status}.`);
  }
  const payload = await response.json();
  const names = new Set(
    (payload.models ?? [])
      .flatMap((model) => [model?.name, model?.model])
      .filter((value) => typeof value === 'string' && value.trim()),
  );
  return { names };
}

async function writeJson(path, value) {
  const target = resolve(path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parseOptions(args) {
  const options = {
    manifest: 'tools/ollama/managed-models.json',
    baseUrl: (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, ''),
    state: 'tmp/runtime/ollama-managed-state.json',
    pullMissing: false,
    includeRetrieval: false,
  };
  for (const arg of args) {
    if (arg === '--check') options.pullMissing = false;
    else if (arg === '--pull-missing') options.pullMissing = true;
    else if (arg === '--include-retrieval') options.includeRetrieval = true;
    else if (arg.startsWith('--manifest=')) options.manifest = arg.slice('--manifest='.length);
    else if (arg.startsWith('--base-url=')) options.baseUrl = arg.slice('--base-url='.length).replace(/\/$/, '');
    else if (arg.startsWith('--state=')) options.state = arg.slice('--state='.length);
    else throw new Error(`Unknown option ${arg}`);
  }
  return options;
}
