import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const MANIFEST_PATH =
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json';
const ACCEPTANCE_PATH =
  'planning/acceptance/shot03-level2-rendered-acceptance.json';
const REQUIRED_LEVEL2_IDS = ['shot03-enki-eyes-v1', 'shot03-rigging-v1'];
const SHA_PATTERN = /^sha256:[a-f0-9]{64}$/i;

async function readAcceptanceIfPresent() {
  try {
    return JSON.parse(await readFile(ACCEPTANCE_PATH, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function prefixedSha(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

test('Shot 3 human acceptance, when present, is cryptographically bound to the reviewed proof and current canonical Level 2 assets', async (t) => {
  const receipt = await readAcceptanceIfPresent();
  if (!receipt) {
    t.skip('Shot 3 rendered human acceptance has not been created yet.');
    return;
  }

  const manifestBytes = await readFile(MANIFEST_PATH);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const shot = manifest.shots?.find((item) => item.sourceShotNumber === 3);
  assert.ok(shot, 'Shot 3 must exist in the canonical animation manifest.');

  assert.equal(receipt.schemaVersion, 1);
  assert.equal(receipt.shotNumber, 3);
  assert.equal(receipt.decision, 'accepted');
  assert.equal(receipt.proof?.proofType, 'shot03-level2-rendered-motion-proof');
  assert.equal(receipt.proof?.deterministicPass, true);

  assert.match(
    receipt.proof?.reportChecksum ?? '',
    SHA_PATTERN,
    'Acceptance must bind the exact rendered-proof JSON checksum.',
  );
  assert.match(
    receipt.proof?.abVideoChecksum ?? '',
    SHA_PATTERN,
    'Acceptance must bind the exact normal-speed A/B MP4 checksum.',
  );
  assert.match(
    receipt.proof?.canonicalVideoChecksum ?? '',
    SHA_PATTERN,
    'Acceptance must bind the exact canonical Level 2 MP4 checksum.',
  );
  assert.equal(
    receipt.proof?.manifestChecksum,
    prefixedSha(manifestBytes),
    'Acceptance receipt is stale: canonical animation manifest changed after review.',
  );

  const boundChecksums = receipt.proof?.approvedLevel2Checksums;
  assert.ok(
    boundChecksums && typeof boundChecksums === 'object',
    'Acceptance must bind approved Level 2 asset checksums.',
  );
  for (const layerId of REQUIRED_LEVEL2_IDS) {
    const layer = shot.layers?.find((item) => item.id === layerId);
    assert.ok(layer, `Canonical manifest is missing ${layerId}.`);
    assert.match(layer.sha256 ?? '', SHA_PATTERN);
    assert.equal(
      boundChecksums[layerId],
      layer.sha256,
      `Acceptance receipt is stale or mismatched for ${layerId}.`,
    );
  }

  assert.equal(receipt.abReview?.watchedAtNormalSpeed, true);
  assert.equal(receipt.abReview?.preferred, 'level2');
  assert.ok(
    Array.isArray(receipt.abReview?.meaningfulImprovements) &&
      receipt.abReview.meaningfulImprovements.length >= 3,
  );
  assert.equal(receipt.abReview?.compensatingLossFound, false);
});
