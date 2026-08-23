import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const DEFAULT_MANIFEST = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const CONTRACT_ROOT = resolve('tools/animation/shot-contracts');

const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
await main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const manifestPath = resolve(options.manifest ?? DEFAULT_MANIFEST);
  const contractPath = resolve(
    options.contract ??
      join(
        CONTRACT_ROOT,
        `reel-01-shot-${String(options.shotNumber).padStart(2, '0')}.json`,
      ),
  );
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const contract = JSON.parse(await readFile(contractPath, 'utf8'));
  const shot = contract.shot;

  validateIdentity({ manifest, contract, shot, shotNumber: options.shotNumber });

  const existingIndex = manifest.shots?.findIndex(
    (item) => item.sourceShotNumber === options.shotNumber,
  ) ?? -1;
  const existing = existingIndex >= 0 ? manifest.shots[existingIndex] : undefined;

  if (existing) {
    if (JSON.stringify(existing) === JSON.stringify(shot)) {
      console.log(
        `Shot ${options.shotNumber} is already admitted with the exact draft contract. No changes required.`,
      );
      return;
    }

    if (!options.refreshDraft) {
      throw new Error(
        `Shot ${options.shotNumber} already exists in animation-v1 and differs from ${contractPath}. Refusing to overwrite it. Use --refresh-draft only for an unapproved draft shot.`,
      );
    }

    validateRefreshableDraft(existing, options.shotNumber);

    console.log(`Animation shot draft refresh — Shot ${options.shotNumber} / ${shot.shotId}`);
    console.log(`[ok] contract: ${contractPath}`);
    console.log('[ok] existing shot is draft');
    console.log('[ok] existing shot has no approved production layers');
    console.log(
      `[ok] required activation layers: ${shot.activationPolicy?.requiredLayerIds?.length ?? 0}`,
    );
    console.log(`[ok] total planned layers: ${shot.layers?.length ?? 0}`);
    console.log('[ok] editorial-v1 remains immutable');
    console.log('[ok] no candidate or animation-v1 asset file will be created or promoted');

    if (!options.apply) {
      console.log('');
      console.log('DRY RUN ONLY — the canonical manifest was NOT modified.');
      console.log(
        `To refresh this draft contract: node tools/scripts/admit-animation-shot-contract.mjs --shot=${options.shotNumber} --refresh-draft --apply --confirm=REFRESH_SHOT_${options.shotNumber}`,
      );
      return;
    }

    const expectedConfirm = `REFRESH_SHOT_${options.shotNumber}`;
    if (options.confirm !== expectedConfirm) {
      throw new Error(
        `Draft refresh requires --confirm=${expectedConfirm}. The manifest was not modified.`,
      );
    }

    const nextShots = [...manifest.shots];
    nextShots[existingIndex] = shot;
    const nextManifest = {
      ...manifest,
      shots: nextShots.sort((a, b) => a.sourceShotNumber - b.sourceShotNumber),
    };
    await writeManifestAtomically(manifestPath, nextManifest, options.shotNumber);

    console.log('');
    console.log(`Shot ${options.shotNumber} draft refreshed from its contract.`);
    console.log(`Manifest: ${manifestPath}`);
    console.log('No production asset was approved or promoted.');
    return;
  }

  console.log(`Animation shot admission — Shot ${options.shotNumber} / ${shot.shotId}`);
  console.log(`[ok] contract: ${contractPath}`);
  console.log(`[ok] source: ${shot.sourceFrame}`);
  console.log(
    `[ok] required activation layers: ${shot.activationPolicy?.requiredLayerIds?.length ?? 0}`,
  );
  console.log(`[ok] total planned layers: ${shot.layers?.length ?? 0}`);
  console.log('[ok] editorial-v1 remains immutable');
  console.log('[ok] no candidate or animation-v1 asset file will be created');

  if (!options.apply) {
    console.log('');
    console.log('DRY RUN ONLY — the canonical manifest was NOT modified.');
    console.log(
      `To admit this contract: node tools/scripts/admit-animation-shot-contract.mjs --shot=${options.shotNumber} --apply --confirm=ADD_SHOT_${options.shotNumber}`,
    );
    return;
  }

  const expectedConfirm = `ADD_SHOT_${options.shotNumber}`;
  if (options.confirm !== expectedConfirm) {
    throw new Error(
      `Apply requires --confirm=${expectedConfirm}. The manifest was not modified.`,
    );
  }

  const nextManifest = {
    ...manifest,
    shots: [...(manifest.shots ?? []), shot].sort(
      (a, b) => a.sourceShotNumber - b.sourceShotNumber,
    ),
  };
  await writeManifestAtomically(manifestPath, nextManifest, options.shotNumber);

  console.log('');
  console.log(`Shot ${options.shotNumber} admitted into animation-v1 as draft/planned.`);
  console.log(`Manifest: ${manifestPath}`);
  console.log('No production asset was approved or promoted.');
}

async function writeManifestAtomically(manifestPath, manifest, shotNumber) {
  const temporaryPath = join(
    dirname(manifestPath),
    `.manifest-shot-${shotNumber}-${process.pid}-${Date.now()}.tmp`,
  );
  await writeFile(
    temporaryPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
  await rename(temporaryPath, manifestPath);
}

function validateIdentity({ manifest, contract, shot, shotNumber }) {
  if (!shot || shot.sourceShotNumber !== shotNumber) {
    throw new Error(`Contract does not define requested Shot ${shotNumber}.`);
  }
  if (
    contract.projectSlug !== manifest.projectSlug ||
    contract.chapterNumber !== manifest.chapterNumber ||
    contract.episodeNumber !== manifest.episodeNumber
  ) {
    throw new Error('Contract project/chapter/episode identity does not match animation-v1 manifest.');
  }
  if (!shot.sourceFrame?.includes(`/shot-${String(shotNumber).padStart(2, '0')}.png`)) {
    throw new Error(`Shot ${shotNumber} contract source frame does not match its shot number.`);
  }
  const required = new Set(shot.activationPolicy?.requiredLayerIds ?? []);
  if (!required.size) {
    throw new Error(`Shot ${shotNumber} contract has no required activation layers.`);
  }
  const layerIds = new Set((shot.layers ?? []).map((layer) => layer.id));
  for (const id of required) {
    if (!layerIds.has(id)) {
      throw new Error(`Shot ${shotNumber} required layer ${id} is not defined in the contract.`);
    }
  }
  if ((shot.layers ?? []).some((layer) => layer.state === 'approved')) {
    throw new Error('Draft shot contracts may not pre-approve production layers.');
  }
}

function validateRefreshableDraft(existing, shotNumber) {
  if (existing.status !== 'draft') {
    throw new Error(
      `Shot ${shotNumber} is ${existing.status ?? 'unknown'}, not draft. Refusing draft refresh.`,
    );
  }
  const approvedLayers = (existing.layers ?? []).filter(
    (layer) => layer.state === 'approved' || layer.review?.status === 'approved',
  );
  if (approvedLayers.length) {
    throw new Error(
      `Shot ${shotNumber} has approved production layer(s): ${approvedLayers.map((layer) => layer.id).join(', ')}. Refusing draft refresh.`,
    );
  }
}

function parseOptions(args) {
  const result = {
    shotNumber: undefined,
    manifest: undefined,
    contract: undefined,
    apply: false,
    refreshDraft: false,
    confirm: undefined,
  };
  for (const arg of args) {
    if (arg.startsWith('--shot=')) {
      const value = Number(arg.slice('--shot='.length));
      if (!Number.isInteger(value) || value < 1) throw new Error(`Invalid ${arg}`);
      result.shotNumber = value;
    } else if (arg.startsWith('--manifest=')) {
      result.manifest = arg.slice('--manifest='.length);
    } else if (arg.startsWith('--contract=')) {
      result.contract = arg.slice('--contract='.length);
    } else if (arg === '--apply') {
      result.apply = true;
    } else if (arg === '--refresh-draft') {
      result.refreshDraft = true;
    } else if (arg.startsWith('--confirm=')) {
      result.confirm = arg.slice('--confirm='.length);
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  if (!result.shotNumber) throw new Error('A positive --shot=<number> is required.');
  return result;
}
