import { spawn } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import {
  promotionPreviewRejectionReason,
  selectNewestPromotablePreview,
} from '../renderer/promotion-preview-policy.mjs';

const PREVIEW_ROOT = resolve('tmp/animation-previews');
const CORE_SCRIPT = resolve('tools/scripts/promote-reviewed-shot-core.mjs');

const args = process.argv.slice(2).filter((arg) => arg !== '--');
await main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const options = parseOptions(args);
  const shotLabel = String(options.shotNumber).padStart(2, '0');
  const expectedPreviewType = `shot${shotLabel}-layered-candidate-preview`;
  const previewRoot = resolve(PREVIEW_ROOT, `shot${shotLabel}-layered-preview`);

  const previewDirectory = options.previewDir
    ? await validateExplicitPreview(options.previewDir, previewRoot, expectedPreviewType)
    : await selectCandidatePreview(previewRoot, expectedPreviewType);

  const forwarded = args.filter((arg) => !arg.startsWith('--preview-dir='));
  forwarded.push(`--preview-dir=${previewDirectory}`);
  await runCore(forwarded);
}

async function validateExplicitPreview(rawDirectory, previewRoot, expectedPreviewType) {
  const directory = resolve(rawDirectory);
  assertInside(previewRoot, directory, 'Reviewed layered preview');
  const preview = JSON.parse(
    await readFile(join(directory, 'preview-manifest.json'), 'utf8'),
  );
  const reason = promotionPreviewRejectionReason(preview, expectedPreviewType);
  if (reason) {
    throw new Error(`Refusing promotion preview ${directory}: ${reason}.`);
  }
  return directory;
}

async function selectCandidatePreview(previewRoot, expectedPreviewType) {
  let entries;
  try {
    entries = await readdir(previewRoot, { withFileTypes: true });
  } catch {
    throw new Error(`No layered preview root found at ${previewRoot}.`);
  }

  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(previewRoot, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));
  const records = [];
  for (const directory of directories) {
    try {
      records.push({
        directory,
        preview: JSON.parse(
          await readFile(join(directory, 'preview-manifest.json'), 'utf8'),
        ),
        review: JSON.parse(await readFile(join(directory, 'shot-review.json'), 'utf8')),
      });
    } catch {
      // Ignore incomplete preview directories.
    }
  }

  const selected = selectNewestPromotablePreview(records, expectedPreviewType);
  if (!selected) {
    throw new Error(
      `No fully reviewed promotable ${expectedPreviewType} candidate preview was found under ${previewRoot}.`,
    );
  }
  return selected;
}

function parseOptions(values) {
  const result = { shotNumber: undefined, previewDir: undefined };
  for (const arg of values) {
    if (arg.startsWith('--shot=')) {
      const value = Number(arg.slice('--shot='.length));
      if (!Number.isInteger(value) || value < 1) throw new Error(`Invalid ${arg}`);
      result.shotNumber = value;
    } else if (arg.startsWith('--preview-dir=')) {
      result.previewDir = arg.slice('--preview-dir='.length);
    }
  }
  if (!result.shotNumber) throw new Error('A positive --shot=<number> is required.');
  return result;
}

function assertInside(parent, child, label) {
  const path = relative(resolve(parent), resolve(child));
  if (path.startsWith('..') || isAbsolute(path)) {
    throw new Error(`${label} must remain under ${parent}: ${child}`);
  }
}

async function runCore(forwardedArgs) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [CORE_SCRIPT, ...forwardedArgs], {
      cwd: process.cwd(),
      env: process.env,
      shell: false,
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
          `Reviewed-shot promotion core failed with ${signal ? `signal ${signal}` : `exit code ${code ?? 'unknown'}`}.`,
        ),
      );
    });
  });
}
