import 'dotenv/config';
import { access } from 'node:fs/promises';
import { loadRendererConfig } from '../renderer/renderer-config.mjs';
import { runProcess } from '../renderer/process-runner.mjs';

const config = loadRendererConfig();
const checks = [];

checks.push(await checkCommand('FFmpeg', config.ffmpegCommand, ['-version']));
if (config.adapter === 'local') {
  checks.push(
    await checkHttp('ComfyUI', `${config.comfyBaseUrl}/system_stats`),
    await checkFile('ComfyUI workflow', config.comfyWorkflowPath),
    await checkCommand('TTS', config.ttsCommand, ['--help']),
    await checkCommand('Whisper', config.whisperCommand, ['--help']),
  );
} else if (config.adapter === 'editorial') {
  checks.push(
    ...(await checkEditorialNarration(config)),
    ...(await checkEditorialFrames(config.editorialAssetDirectory, 8)),
  );
} else if (config.adapter === 'mock') {
  checks.push(await checkPlaywright());
} else {
  checks.push({
    ok: false,
    name: 'Renderer adapter',
    detail: `Unknown RENDER_ADAPTER '${config.adapter}'.`,
  });
}

for (const check of checks) {
  console.log(
    `${check.ok ? '[ok]' : '[failed]'} ${check.name}: ${check.detail}`,
  );
}
if (checks.some((check) => !check.ok)) {
  process.exitCode = 1;
}

async function checkCommand(name, command, args) {
  try {
    await runProcess(command, args, { timeoutMs: 15000 });
    return { ok: true, name, detail: command };
  } catch (error) {
    return { ok: false, name, detail: error.message };
  }
}

async function checkHttp(name, url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    return {
      ok: response.ok,
      name,
      detail: response.ok ? url : `HTTP ${response.status}`,
    };
  } catch (error) {
    return { ok: false, name, detail: error.message };
  }
}

async function checkFile(name, path) {
  if (!path) {
    return { ok: false, name, detail: 'COMFYUI_WORKFLOW_PATH is not set.' };
  }
  try {
    await access(path);
    return { ok: true, name, detail: path };
  } catch {
    return { ok: false, name, detail: `File not found: ${path}` };
  }
}

async function checkPlaywright() {
  try {
    const { chromium } = await import('@playwright/test');
    const browser = await chromium.launch({ headless: true });
    await browser.close();
    return { ok: true, name: 'Playwright Chromium', detail: 'available' };
  } catch (error) {
    return { ok: false, name: 'Playwright Chromium', detail: error.message };
  }
}

async function checkEditorialFrames(directory, count) {
  const checks = [];
  for (let shot = 1; shot <= count; shot += 1) {
    const filename = `shot-${String(shot).padStart(2, '0')}.png`;
    checks.push(
      await checkFile(`Editorial frame ${shot}`, `${directory}/${filename}`),
    );
  }
  return checks;
}

async function checkEditorialNarration(config) {
  if (config.editorialNarrationAdapter === 'kokoro') {
    return [
      await checkCommand('uv', config.kokoroCommand, ['--version']),
      await checkFile(
        'Kokoro project',
        `${config.kokoroProjectDirectory}/uv.lock`,
      ),
      await checkFile('Kokoro script', config.kokoroScript),
      await checkFile('Kokoro model', config.kokoroModelPath),
      await checkFile('Kokoro voices', config.kokoroVoicesPath),
    ];
  }
  return [
    await checkFile('Windows speech script', config.windowsSpeechScript),
    await checkCommand('Windows speech', config.windowsSpeechCommand, [
      '-NoProfile',
      '-NonInteractive',
      '-File',
      config.windowsSpeechScript,
      '-ListVoices',
    ]),
  ];
}
