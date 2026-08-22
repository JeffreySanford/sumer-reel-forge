import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { access, mkdir, rename, rm } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { basename, dirname, resolve } from 'node:path';
import { runProcess } from '../renderer/process-runner.mjs';

const projectDirectory = resolve(
  process.env.KOKORO_PROJECT_DIRECTORY ?? 'tools/tts',
);
const assets = [
  {
    path: resolve(
      process.env.KOKORO_MODEL_PATH ?? '.cache/kokoro/kokoro-v1.0.onnx',
    ),
    url: 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx',
    sha256: '7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5',
  },
  {
    path: resolve(
      process.env.KOKORO_VOICES_PATH ?? '.cache/kokoro/voices-v1.0.bin',
    ),
    url: 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin',
    sha256: 'bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d',
  },
];

await runProcess(
  process.env.KOKORO_COMMAND ?? 'uv',
  [
    'sync',
    '--project',
    projectDirectory,
    '--locked',
    '--python',
    '3.12',
    '--link-mode',
    'copy',
  ],
  {
    timeoutMs: 900000,
    onStdout: (message) => process.stdout.write(message),
    onStderr: (message) => process.stderr.write(message),
  },
);

for (const asset of assets) {
  if ((await checksumIfPresent(asset.path)) === asset.sha256) {
    console.log(`[ok] ${basename(asset.path)} already matches its checksum.`);
    continue;
  }
  await downloadVerified(asset);
}

console.log('Kokoro is installed in the project-local uv environment.');

async function downloadVerified(asset) {
  await mkdir(dirname(asset.path), { recursive: true });
  const partialPath = `${asset.path}.part`;
  await rm(partialPath, { force: true });
  console.log(`Downloading ${basename(asset.path)}...`);
  const response = await fetch(asset.url, {
    signal: AbortSignal.timeout(900000),
    headers: { 'user-agent': 'sumer-reel-forge-local-setup' },
  });
  if (!response.ok || !response.body) {
    throw new Error(
      `Could not download ${asset.url}: HTTP ${response.status}.`,
    );
  }
  await pipeline(
    Readable.fromWeb(response.body),
    createWriteStream(partialPath),
  );
  const checksum = await sha256(partialPath);
  if (checksum !== asset.sha256) {
    await rm(partialPath, { force: true });
    throw new Error(
      `${basename(asset.path)} checksum mismatch: expected ${asset.sha256}, received ${checksum}.`,
    );
  }
  await rm(asset.path, { force: true });
  await rename(partialPath, asset.path);
  console.log(`[ok] ${basename(asset.path)} verified.`);
}

async function checksumIfPresent(path) {
  try {
    await access(path);
    return sha256(path);
  } catch {
    return undefined;
  }
}

function sha256(path) {
  return new Promise((resolvePromise, reject) => {
    const hash = createHash('sha256');
    const input = createReadStream(path);
    input.on('error', reject);
    input.on('data', (chunk) => hash.update(chunk));
    input.on('end', () => resolvePromise(hash.digest('hex')));
  });
}
