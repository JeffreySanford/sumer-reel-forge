import { createHash } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

const ROOT = resolve('.');
const PREP_ROOT = resolve('tmp/animation-assets/rig-prep/enki/v1');
const EXPECTED_GATE = 'ENKI-RIG-0';
const EXPECTED_RIG_FILE = 'enki-neutral-v1.riv';

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const workspace = await latestPrepWorkspace();
  const sourceReceiptPath = join(workspace, 'evidence', 'source-receipt.json');
  const authoringContractPath = join(workspace, 'evidence', 'neutral-authoring-contract.json');
  const referencePath = join(workspace, 'source', 'reference-enki.png');
  const candidatePath = join(workspace, 'candidate', EXPECTED_RIG_FILE);

  const [sourceReceipt, contract, referenceBytes] = await Promise.all([
    readJson(sourceReceiptPath),
    readJson(authoringContractPath),
    readFile(referencePath),
  ]);

  if (sourceReceipt.gateId !== EXPECTED_GATE || contract.gateId !== EXPECTED_GATE) {
    throw new Error('Latest Enki Rive prep workspace is not ENKI-RIG-0.');
  }
  const referenceSha = prefixedSha(referenceBytes);
  if (referenceSha !== sourceReceipt.sourceSha256 || referenceSha !== sourceReceipt.copiedSha256) {
    throw new Error(
      `Neutral reference digest drifted: expected ${sourceReceipt.sourceSha256}, received ${referenceSha}.`,
    );
  }
  if (contract.output?.expectedRigFile !== candidatePath) {
    throw new Error(
      `Neutral authoring contract expects ${contract.output?.expectedRigFile ?? '<missing>'}, not ${candidatePath}.`,
    );
  }
  if (contract.output?.artboardName !== 'Enki') {
    throw new Error('Neutral authoring contract must require artboard Enki.');
  }
  if ((contract.neutralGate?.animationsAllowed ?? []).length !== 0) {
    throw new Error('ENKI-RIG-0 authoring contract unexpectedly allows animation.');
  }

  console.log('Shot 3 Enki Rive neutral candidate handoff');
  console.log(`Gate: ${EXPECTED_GATE}`);
  console.log(`Workspace: ${workspace}`);
  console.log(`Reference: ${referencePath}`);
  console.log(`Reference SHA-256: ${referenceSha}`);
  console.log(`Expected candidate: ${candidatePath}`);
  console.log('');

  if (!existsSync(candidatePath)) {
    console.log('[WAIT] Neutral .riv candidate does not exist yet.');
    console.log('[AUTHOR] In Rive Editor:');
    console.log('  1. Create a new file/artboard named Enki at 941x1672.');
    console.log(`  2. Import ${referencePath} as the single neutral image asset.`);
    console.log('  3. Place it at native size and source registration; do not crop, resample, mesh, bone, deform, animate, or add a state machine.');
    console.log(`  4. Download/export the neutral file as ${candidatePath}.`);
    console.log('  5. Re-run this command.');
    console.log('');
    console.log('[STOP] Runtime installation and motion authoring remain blocked until the candidate exists and neutral identity is proven.');
    return;
  }

  const candidateStats = statSync(candidatePath);
  if (!candidateStats.isFile() || candidateStats.size <= 0) {
    throw new Error(`Neutral Rive candidate is empty or not a file: ${candidatePath}`);
  }
  const candidateBytes = await readFile(candidatePath);
  const candidateSha = prefixedSha(candidateBytes);

  const receipt = {
    schemaVersion: 1,
    type: 'enki-rive-neutral-candidate-handoff',
    gateId: EXPECTED_GATE,
    workspace,
    source: {
      path: referencePath,
      sha256: referenceSha,
      dimensions: sourceReceipt.dimensions,
    },
    candidate: {
      path: candidatePath,
      sha256: candidateSha,
      bytes: candidateBytes.length,
    },
    assertions: {
      sourceReceiptStillMatches: true,
      candidateExists: true,
      candidateNonEmpty: true,
      runtimeInspectionPending: true,
      humanNeutralIdentityApprovalPending: true,
    },
    nextGate:
      'Install the pinned Rive runtime together with pnpm-lock, inspect artboard/state-machine/animation metadata, render neutral A/B, and require human identity approval.',
  };

  const receiptPath = join(workspace, 'evidence', 'candidate-handoff.json');
  await import('node:fs/promises').then(({ writeFile }) =>
    writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8'),
  );

  console.log(`[PASS] Neutral .riv candidate exists · ${candidateBytes.length} bytes · ${candidateSha}`);
  console.log(`[INFO] Handoff receipt: ${receiptPath}`);
  console.log('[STOP] File existence is not neutral identity acceptance. Runtime inspection/render proof is the next gate; do not author motion yet.');
}

async function latestPrepWorkspace() {
  if (!existsSync(PREP_ROOT)) {
    throw new Error(`No Enki Rive rig-prep root exists: ${PREP_ROOT}`);
  }
  const entries = await readdir(PREP_ROOT, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(PREP_ROOT, entry.name))
    .sort((left, right) => basename(right).localeCompare(basename(left)));

  for (const directory of directories) {
    const sourceReceipt = join(directory, 'evidence', 'source-receipt.json');
    const contract = join(directory, 'evidence', 'neutral-authoring-contract.json');
    const reference = join(directory, 'source', 'reference-enki.png');
    if ([sourceReceipt, contract, reference].every(existsSync)) return directory;
  }
  throw new Error('No complete Enki Rive neutral prep workspace found.');
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function prefixedSha(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}
