import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const ROOT = resolve('.');
const CHARACTER_PROOF_ROOT = resolve(
  'tmp/animation-previews/pixi-shot03-recovered-character-motion-proof',
);
const OUTPUT_ROOT = resolve('tmp/animation-assets/actor-prep/enki/v1');
const EXPECTED_PROOF_TYPE = 'pixi-shot03-recovered-character-motion-proof';

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
  const evidenceDirectory = join(workspace, 'evidence');
  await Promise.all([
    mkdir(sourceDirectory, { recursive: true }),
    mkdir(evidenceDirectory, { recursive: true }),
  ]);

  const referencePath = join(sourceDirectory, 'reference-enki.png');
  await copyFile(sourcePath, referencePath);
  const copiedSha256 = prefixedSha(await readFile(referencePath));
  if (copiedSha256 !== sourceSha256) {
    throw new Error('Automated actor-prep reference is not byte-identical to accepted Enki source.');
  }

  const sourceReceipt = Object.freeze({
    schemaVersion: 1,
    type: 'actor-prep-source-receipt',
    actorId: 'actor:enki',
    sourceAssetId: 'shot03-recovered-enki-v1',
    sourceProofPath: accepted.reportPath,
    sourcePath,
    referencePath,
    sourceSha256,
    copiedSha256,
    dimensions,
    registration: 'source-frame-top-left',
    copiedSourcePixels: true,
    generatedPixels: false,
    resampledPixels: false,
    canonicalPromotion: false,
  });

  const actorPrep = Object.freeze({
    schemaVersion: 1,
    id: 'actor-prep:enki:v1',
    actorId: 'actor:enki',
    revision: 1,
    source: {
      assetId: sourceReceipt.sourceAssetId,
      sha256: sourceSha256,
      width: dimensions.width,
      height: dimensions.height,
      registration: sourceReceipt.registration,
      canonicalPromotion: false,
    },
    automation: {
      headlessDefault: true,
      recurringManualEditorAllowed: false,
      humanReviewRole: 'accept-reject',
      failedAutomationPolicy: 'reject-or-fallback',
    },
    regions: regionDefinitions(),
    anchors: anchorDefinitions(),
    backendCandidates: [
      {
        id: 'backend:native-source-regions',
        backendClass: 'deterministic-procedural',
        status: 'preferred',
        headlessRequired: true,
        recurringManualEditorAllowed: false,
        liveStoryTimeAuthorityAllowed: false,
        licenseEvidenceRequired: false,
        notes:
          'Preferred first path: exact-frame source-backed regions and local deformation only where automated source prep is trustworthy.',
      },
      {
        id: 'backend:liveportrait-baked-face',
        backendClass: 'baked-generative',
        status: 'license-blocked',
        headlessRequired: true,
        recurringManualEditorAllowed: false,
        liveStoryTimeAuthorityAllowed: false,
        licenseEvidenceRequired: true,
        notes:
          'Experimental only. Production is blocked until the upstream InsightFace non-commercial detection-model dependency is replaced or otherwise resolved.',
      },
      {
        id: 'backend:rive-reusable-rig',
        backendClass: 'reusable-rig',
        status: 'deferred',
        headlessRequired: true,
        recurringManualEditorAllowed: false,
        liveStoryTimeAuthorityAllowed: false,
        licenseEvidenceRequired: true,
        notes:
          'Neutral contract evidence is retained, but manual .riv authoring is not the production critical path.',
      },
    ],
  });

  const backendEvidence = Object.freeze({
    schemaVersion: 1,
    actorPrepId: actorPrep.id,
    evaluatedAt: 'planning-policy-2026-08-26',
    backends: {
      nativeSourceRegions: {
        status: 'preferred',
        installed: true,
        blocker: null,
      },
      livePortrait: {
        status: 'license-blocked',
        installed: false,
        blocker:
          'Commercial production blocked until restricted bundled InsightFace detection models are replaced/resolved and license evidence is recorded.',
      },
      rive: {
        status: 'deferred',
        installed: false,
        blocker:
          'Manual editor authoring conflicts with the default many-reel automation workflow; retain only as an optional future reusable-rig comparison.',
      },
    },
  });

  const proofPlan = Object.freeze({
    schemaVersion: 1,
    actorPrepId: actorPrep.id,
    currentStage: 'SOURCE_IDENTITY',
    nextStage: 'AUTOMATED_REGION_DISCOVERY',
    acceptedBaseline: {
      motion:
        'camera + vessel heave/roll + vessel-carried Enki + Enki local counter-sway/body-settle',
      humanAccepted: true,
      sourceSha256,
    },
    rejectedShot03Channels: [
      'canonical blink overlay',
      'stronger blink replacement',
      'whole-cutout breathe-calm',
      'legacy water extraction',
      'legacy rigging extraction',
      'fresh rigging ROI recovery',
    ],
    nextRequiredChecks: [
      'discover semantic regions/landmarks headlessly',
      'reject contaminated/unsupported regions without manual repair',
      'verify source-pixel fidelity for source-backed regions',
      'record confidence and exact source registration',
      'keep backend/model/license evidence separate from semantic actor identity',
    ],
  });

  const definitionHash = prefixedSha(
    Buffer.from(JSON.stringify(actorPrep), 'utf8'),
  );
  const packetReceipt = Object.freeze({
    schemaVersion: 1,
    type: 'automated-actor-prep-packet',
    actorPrepId: actorPrep.id,
    workspace,
    sourceSha256,
    definitionSha256: definitionHash,
    automation: {
      manualEditorInvocations: 0,
      modelInvocations: 0,
      generatedPixels: false,
    },
    pass: true,
  });

  const paths = {
    sourceReceipt: join(evidenceDirectory, 'source-receipt.json'),
    actorPrep: join(workspace, 'actor-prep.json'),
    backendEvidence: join(evidenceDirectory, 'backend-evidence.json'),
    proofPlan: join(evidenceDirectory, 'proof-plan.json'),
    packetReceipt: join(evidenceDirectory, 'packet-receipt.json'),
  };
  await Promise.all([
    writeJson(paths.sourceReceipt, sourceReceipt),
    writeJson(paths.actorPrep, actorPrep),
    writeJson(paths.backendEvidence, backendEvidence),
    writeJson(paths.proofPlan, proofPlan),
    writeJson(paths.packetReceipt, packetReceipt),
  ]);

  console.log('Shot 3 Enki automated actor-prep');
  console.log(`Accepted character proof: ${accepted.reportPath}`);
  console.log(`Source: ${sourcePath}`);
  console.log(`SHA-256: ${sourceSha256}`);
  console.log(`Dimensions: ${dimensions.width}x${dimensions.height}`);
  console.log(`Workspace: ${workspace}`);
  console.log(`Actor prep: ${paths.actorPrep}`);
  console.log(`Definition SHA-256: ${definitionHash}`);
  console.log('');
  console.log('[PASS] actor-prep packet created with 0 manual-editor invocations and 0 model invocations.');
  console.log('[INFO] native source-region backend preferred; LivePortrait remains license-blocked; Rive remains deferred.');
  console.log('[NEXT] automated semantic region/landmark discovery against this exact source receipt.');
}

function regionDefinitions() {
  return [
    ['region:enki:head', 'head', true],
    ['region:enki:face', 'face', true],
    ['region:enki:hair-beard', 'hair-beard', true],
    ['region:enki:eye-left', 'eye-left', true],
    ['region:enki:eye-right', 'eye-right', true],
    ['region:enki:crown', 'crown', true],
    ['region:enki:torso-robe', 'torso-robe', false],
    ['region:enki:upper-arm-left', 'upper-arm-left', false],
    ['region:enki:upper-arm-right', 'upper-arm-right', false],
    ['region:enki:forearm-left', 'forearm-left', false],
    ['region:enki:forearm-right', 'forearm-right', false],
    ['region:enki:hand-left', 'hand-left', true],
    ['region:enki:hand-right', 'hand-right', true],
  ].map(([id, semanticRole, identitySensitive]) => ({
    id,
    semanticRole,
    status: 'pending-auto-discovery',
    sourceBackedRequired: true,
    identitySensitive,
  }));
}

function anchorDefinitions() {
  return [
    ['anchor:enki:hand-left', 'hand-left'],
    ['anchor:enki:hand-right', 'hand-right'],
    ['anchor:enki:gaze-origin', 'gaze-origin'],
    ['anchor:enki:head-center', 'head-center'],
    ['anchor:enki:torso-root', 'torso-root'],
    ['anchor:enki:seat-or-stance-root', 'seat-or-stance-root'],
  ].map(([id, semanticRole]) => ({
    id,
    semanticRole,
    status: 'pending-auto-discovery',
  }));
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
  throw new Error('No passing recovered-character proof is available for automated actor prep.');
}

function parsePngDimensions(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 24) {
    throw new Error('Enki actor-prep source is not a valid PNG buffer.');
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!bytes.subarray(0, 8).equals(signature)) {
    throw new Error('Enki actor-prep source is not a PNG.');
  }
  if (bytes.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error('Enki actor-prep source PNG is missing IHDR at the expected position.');
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
