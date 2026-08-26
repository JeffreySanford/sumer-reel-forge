import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { maybeOpenReviewArtifacts } from './open-review-artifacts.mjs';

const ROOT = resolve('.');
const CHARACTER_PROOF_ROOT = resolve(
  'tmp/animation-previews/pixi-shot03-recovered-character-motion-proof',
);
const OUTPUT_ROOT = resolve('tmp/animation-assets/rig-prep/enki/v1');
const EXPECTED_PROOF_TYPE = 'pixi-shot03-recovered-character-motion-proof';
const EXPECTED_ACTOR_ID = 'actor:enki';
const EXPECTED_RIG_FILE = 'enki-neutral-v1.riv';
const RIVE_RUNTIME = Object.freeze({
  packageName: '@rive-app/webgl2',
  versionCandidate: '2.40.1',
  license: 'MIT',
  dependencyInstalled: false,
  verifiedAt: '2026-08-26',
});

const options = parseOptions(process.argv.slice(2));

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const accepted = await latestPassingCharacterProof();
  const enki = accepted.report.sourceAssets?.enki;
  if (!enki?.path || !enki?.sha256) {
    throw new Error('Accepted recovered-character proof is missing Enki source identity.');
  }

  const sourcePath = resolve(enki.path);
  if (!existsSync(sourcePath)) {
    throw new Error(`Accepted recovered Enki source is missing: ${sourcePath}`);
  }
  const sourceBytes = await readFile(sourcePath);
  const sourceSha256 = prefixedSha(sourceBytes);
  if (sourceSha256 !== enki.sha256) {
    throw new Error(
      `Accepted recovered Enki digest changed: receipt=${enki.sha256}, current=${sourceSha256}.`,
    );
  }
  const dimensions = parsePngDimensions(sourceBytes);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const workspace = join(OUTPUT_ROOT, stamp);
  const sourceDirectory = join(workspace, 'source');
  const candidateDirectory = join(workspace, 'candidate');
  const evidenceDirectory = join(workspace, 'evidence');
  await Promise.all([
    mkdir(sourceDirectory, { recursive: true }),
    mkdir(candidateDirectory, { recursive: true }),
    mkdir(evidenceDirectory, { recursive: true }),
  ]);

  const referencePath = join(sourceDirectory, 'reference-enki.png');
  await copyFile(sourcePath, referencePath);
  const copiedSha256 = prefixedSha(await readFile(referencePath));
  if (copiedSha256 !== sourceSha256) {
    throw new Error('Neutral rig-prep copy is not byte-identical to accepted Enki source.');
  }

  const sourceReceipt = {
    schemaVersion: 1,
    type: 'enki-rive-neutral-source-receipt',
    gateId: 'ENKI-RIG-0',
    actorId: EXPECTED_ACTOR_ID,
    sourceAssetId: 'shot03-recovered-enki-v1',
    sourceProofPath: accepted.reportPath,
    sourcePath,
    referencePath,
    sourceSha256,
    copiedSha256,
    dimensions,
    copiedSourcePixels: true,
    generatedPixels: false,
    resampledPixels: false,
    canonicalAssetsMutated: false,
    canonicalManifestMutated: false,
    humanAcceptedBaseline:
      'Recovered camera + vessel + Enki counter-sway is the current human-accepted Shot 3 proof-lane baseline. This receipt does not promote that candidate into canonical production assets.',
  };

  const registration = {
    schemaVersion: 1,
    type: 'enki-rive-neutral-registration',
    sourceSpace: {
      width: dimensions.width,
      height: dimensions.height,
      origin: 'top-left',
      sourcePixelsMustRemainUnresampledForRigPrep: true,
    },
    currentProofTransformReference: {
      enkiRootPivotNormalized: { x: 0.5, y: 0.46 },
      note:
        'This is the accepted Pixi proof pivot, not an anatomical bone decision. Rive authoring landmarks remain pending human rig preparation.',
    },
    requiredSemanticAnchors: [
      'anchor:enki:hand-left',
      'anchor:enki:hand-right',
      'anchor:enki:gaze-origin',
      'anchor:enki:head-center',
      'anchor:enki:torso-root',
      'anchor:enki:seat-or-stance-root',
    ].map((id) => ({ id, status: 'pending-rig-authoring', coordinates: null })),
  };

  const authoringContract = {
    schemaVersion: 1,
    type: 'enki-rive-neutral-authoring-contract',
    gateId: 'ENKI-RIG-0',
    actorId: EXPECTED_ACTOR_ID,
    rigId: 'rig:enki:neutral:v1',
    input: {
      referencePath,
      sha256: sourceSha256,
      dimensions,
      identityAuthority: [
        'Blessings of Sumer visual bible v1',
        'approved Reel 1 Shot 3 editorial source',
        'human-accepted recovered Enki proof source',
      ],
    },
    output: {
      candidateDirectory,
      expectedRigFile: join(candidateDirectory, EXPECTED_RIG_FILE),
      artboardName: 'Enki',
      artboardWidth: dimensions.width,
      artboardHeight: dimensions.height,
    },
    runtime: {
      ...RIVE_RUNTIME,
      autoplay: false,
      autonomousClockAllowed: false,
      frameAuthority: 'scene-v3-frame-context',
    },
    neutralGate: {
      stateMachineName: null,
      animationsAllowed: [],
      deformersAllowed: [],
      generatedReplacementPixelsAllowed: false,
      sourceRasterResamplingAllowedDuringPrep: false,
      identityMutationAllowed: false,
      motionAuthoringAllowedBeforeHumanNeutralApproval: false,
      requiredHumanQuestion:
        'Does the Rive neutral render still look like the accepted Enki source without identity, silhouette, face, crown, costume, or painterly drift?',
    },
  };

  const proofPlan = {
    schemaVersion: 1,
    type: 'enki-rive-neutral-proof-plan',
    gateId: 'ENKI-RIG-0',
    candidateRigPath: authoringContract.output.expectedRigFile,
    controlReferencePath: referencePath,
    runtimeInstallationDeferredUntilCandidateExists: true,
    requiredChecks: [
      'candidate .riv exists and source receipt SHA still matches',
      'Rive runtime dependency and pnpm lockfile land together',
      'autoplay disabled and no runtime-owned requestAnimationFrame story clock',
      'neutral state contains zero animations and zero active state machines',
      'same neutral rig state at Scene V3 frames 0, 55, 101, 165, and 209',
      'rendered neutral identity compared against accepted source at native registration',
      'no generated/debug pixels, rectangular patches, or hidden motion',
      'human identity approval required before ENKI-RIG-1 blink work',
    ],
    rejectedChannelsRemainDisabled: [
      'blink overlay',
      'whole-cutout breathe-calm',
      'legacy water',
      'legacy rigging',
      'failed rigging ROI recovery',
    ],
  };

  const readme = `# Enki Rive neutral rig-prep workspace\n\nGate: **ENKI-RIG-0 neutral identity**\n\nThis workspace was generated from the latest passing recovered-character proof. The source PNG was copied byte-for-byte and SHA verified.\n\n## Input\n\n- Reference: ${referencePath}\n- SHA-256: ${sourceSha256}\n- Dimensions: ${dimensions.width}x${dimensions.height}\n- Source proof: ${accepted.reportPath}\n\n## Authoring target\n\nCreate **${EXPECTED_RIG_FILE}** in the candidate directory with an artboard named **Enki** at ${dimensions.width}x${dimensions.height}. The neutral gate contains no animation, no state machine, no generated replacement pixels, and no intended deformation.\n\nDo not create blink, gaze, breathing, helm, hair, robe, or secondary-motion channels yet. The first job is simply to prove that the Rive path can preserve Enki's accepted neutral identity.\n\nThe repository intentionally does not install @rive-app/webgl2 yet. Once the candidate .riv exists, add the runtime and pnpm lockfile in the same commit, then build the neutral render proof.\n`;

  const sourceReceiptPath = join(evidenceDirectory, 'source-receipt.json');
  const registrationPath = join(evidenceDirectory, 'registration.json');
  const authoringContractPath = join(evidenceDirectory, 'neutral-authoring-contract.json');
  const proofPlanPath = join(evidenceDirectory, 'neutral-proof-plan.json');
  const readmePath = join(workspace, 'README.md');
  await Promise.all([
    writeJson(sourceReceiptPath, sourceReceipt),
    writeJson(registrationPath, registration),
    writeJson(authoringContractPath, authoringContract),
    writeJson(proofPlanPath, proofPlan),
    writeFile(readmePath, readme, 'utf8'),
  ]);

  console.log('Shot 3 Enki Rive neutral rig-prep');
  console.log(`Gate: ENKI-RIG-0`);
  console.log(`Accepted character proof: ${accepted.reportPath}`);
  console.log(`Source: ${sourcePath}`);
  console.log(`SHA-256: ${sourceSha256}`);
  console.log(`Dimensions: ${dimensions.width}x${dimensions.height}`);
  console.log(`Workspace: ${workspace}`);
  console.log(`Reference: ${referencePath}`);
  console.log(`Source receipt: ${sourceReceiptPath}`);
  console.log(`Registration: ${registrationPath}`);
  console.log(`Authoring contract: ${authoringContractPath}`);
  console.log(`Proof plan: ${proofPlanPath}`);
  console.log(`Expected future candidate: ${authoringContract.output.expectedRigFile}`);
  console.log('');
  console.log('[PASS] neutral rig-prep source is byte-identical to the accepted recovered Enki proof source.');
  console.log('[STOP] No .riv is generated automatically. Do not author motion before neutral identity is human-approved.');
  console.log('[INFO] @rive-app/webgl2 installation remains deferred so package.json and pnpm-lock stay unchanged until a real neutral .riv candidate exists.');

  await maybeOpenReviewArtifacts([referencePath], {
    enabled: !options.noOpen,
    delayMs: 120,
  });
}

async function latestPassingCharacterProof() {
  if (!existsSync(CHARACTER_PROOF_ROOT)) {
    throw new Error(`No recovered-character proof root exists: ${CHARACTER_PROOF_ROOT}`);
  }
  const entries = await readdir(CHARACTER_PROOF_ROOT, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(CHARACTER_PROOF_ROOT, entry.name))
    .sort((left, right) => basename(right).localeCompare(basename(left)));

  for (const directory of directories) {
    const reportPath = join(
      directory,
      'pixi-shot03-recovered-character-motion-proof.json',
    );
    if (!existsSync(reportPath)) continue;
    try {
      const report = JSON.parse(await readFile(reportPath, 'utf8'));
      if (report.proofType !== EXPECTED_PROOF_TYPE) continue;
      if (report.technicalEvidence?.pass !== true) continue;
      if (report.aiStatus && report.aiStatus !== 'PASS_ADVISORY') continue;
      return { reportPath, report };
    } catch {
      continue;
    }
  }
  throw new Error('No passing recovered-character proof is available for Rive neutral rig prep.');
}

function parsePngDimensions(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 24) {
    throw new Error('Enki rig-prep source is not a valid PNG buffer.');
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!bytes.subarray(0, 8).equals(signature)) {
    throw new Error('Enki rig-prep source is not a PNG.');
  }
  const chunkType = bytes.toString('ascii', 12, 16);
  if (chunkType !== 'IHDR') {
    throw new Error(`Expected PNG IHDR chunk, received ${chunkType}.`);
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (!width || !height) throw new Error('PNG dimensions must be positive.');
  return { width, height };
}

function prefixedSha(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parseOptions(args) {
  const result = { noOpen: false };
  for (const arg of args) {
    if (arg === '--no-open') result.noOpen = true;
    else throw new Error(`Unknown option ${arg}.`);
  }
  return result;
}
