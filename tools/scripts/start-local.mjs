import 'dotenv/config';
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const root = dirname(dirname(dirname(scriptPath)));
const coreScript = join(root, 'tools', 'scripts', 'start-all.mjs');
const rendererScript = join(root, 'tools', 'scripts', 'renderer-worker.mjs');
const rendererAdapter = process.env.RENDER_ADAPTER ?? 'editorial';
const rendererWorkerId = process.env.RENDER_WORKER_ID ?? 'local-renderer';

let stopping = false;
let coreProcess;
let rendererProcess;

function spawnNode(script, envOverrides = {}) {
  return spawn(process.execPath, [script], {
    cwd: root,
    env: {
      ...process.env,
      ...envOverrides,
    },
    stdio: 'inherit',
    windowsHide: true,
  });
}

function waitForPort(port, timeoutMs) {
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect(port, '127.0.0.1');

      socket.once('connect', () => {
        socket.end();
        resolve();
      });

      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - started >= timeoutMs) {
          reject(new Error(`port ${port} did not open within ${timeoutMs}ms`));
          return;
        }
        setTimeout(attempt, 500);
      });
    };

    attempt();
  });
}

function stopChild(child) {
  if (!child?.pid || child.killed) {
    return;
  }

  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }

  child.kill('SIGINT');
}

function stopAll(exitCode) {
  if (stopping) {
    return;
  }

  stopping = true;
  stopChild(rendererProcess);
  stopChild(coreProcess);
  process.exitCode = exitCode;
}

async function main() {
  coreProcess = spawnNode(coreScript);

  coreProcess.once('exit', (code, signal) => {
    if (stopping) {
      return;
    }
    console.error(
      signal
        ? `Core local runtime exited with signal ${signal}.`
        : `Core local runtime exited with code ${code ?? 0}.`,
    );
    stopAll(code ?? 1);
  });

  await waitForPort(3000, 60000);
  if (stopping) {
    return;
  }

  rendererProcess = spawnNode(rendererScript, {
    RENDER_ADAPTER: rendererAdapter,
    RENDER_WORKER_ID: rendererWorkerId,
  });

  rendererProcess.once('exit', (code, signal) => {
    if (stopping) {
      return;
    }
    console.error(
      signal
        ? `Renderer worker exited with signal ${signal}.`
        : `Renderer worker exited with code ${code ?? 0}.`,
    );
    stopAll(code ?? 1);
  });

  console.log(
    `Managed renderer worker started: ${rendererWorkerId} / ${rendererAdapter}.`,
  );
}

process.on('SIGINT', () => stopAll(130));
process.on('SIGTERM', () => stopAll(143));

main().catch((error) => {
  console.error(`Managed local startup failed: ${error.message}`);
  stopAll(1);
});
