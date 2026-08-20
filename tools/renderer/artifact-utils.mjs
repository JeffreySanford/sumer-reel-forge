import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function prepareOutputDirectory(root, jobId) {
  const outputDirectory = resolve(root, jobId);
  await mkdir(outputDirectory, { recursive: true });
  return outputDirectory;
}

export async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function writeText(filePath, value) {
  await writeFile(filePath, value, 'utf8');
}

export async function sha256(filePath) {
  const contents = await readFile(filePath);
  return `sha256:${createHash('sha256').update(contents).digest('hex')}`;
}

export function toFileUri(filePath) {
  return pathToFileURL(resolve(filePath)).href;
}

export function toSrt(captions, durationSeconds) {
  return captions
    .map((caption, index) => {
      const start = parseTimestamp(caption.time);
      const next = captions[index + 1];
      const end = next ? parseTimestamp(next.time) : durationSeconds;
      return `${index + 1}\n${formatSrtTime(start)} --> ${formatSrtTime(end)}\n${caption.text}\n`;
    })
    .join('\n');
}

function parseTimestamp(value) {
  const parts = value.split(':').map(Number);
  return parts.length === 2 ? parts[0] * 60 + parts[1] : 0;
}

function formatSrtTime(seconds) {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remaining = Math.floor(safe % 60);
  return `${pad(hours)}:${pad(minutes)}:${pad(remaining)},000`;
}

function pad(value) {
  return String(value).padStart(2, '0');
}
