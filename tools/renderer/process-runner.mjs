import { spawn, spawnSync } from 'node:child_process';

export async function runProcess(command, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 300000;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      terminateProcessTree(child);
      finish(
        new Error(
          `${command} exceeded its ${Math.round(timeoutMs / 1000)}s timeout.`,
        ),
      );
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      const message = String(chunk);
      stdout = appendBounded(stdout, message);
      options.onStdout?.(message);
    });
    child.stderr.on('data', (chunk) => {
      const message = String(chunk);
      stderr = appendBounded(stderr, message);
      options.onStderr?.(message);
    });
    child.on('error', finish);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        finish(undefined, { code, signal, stdout, stderr });
        return;
      }
      finish(
        new Error(
          `${command} exited with ${signal ? `signal ${signal}` : `code ${code}`}: ${stderr.trim() || stdout.trim()}`,
        ),
      );
    });

    function finish(error, result) {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    }
  });
}

function terminateProcessTree(child) {
  if (!child.pid || child.killed) {
    return;
  }
  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }
  child.kill('SIGKILL');
}

function appendBounded(current, addition) {
  const combined = `${current}${addition}`;
  return combined.length > 1000000 ? combined.slice(-1000000) : combined;
}
