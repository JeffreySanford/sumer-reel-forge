# Release Rollback and Reconstruction Drill

Status: **final pre-implementation operational contract**

A release process is only trustworthy if an old reel can be reconstructed and a bad promotion can be rolled back without guessing which files were current at the time.

## Objectives

A rollback/reconstruction drill must prove that the repository can:

1. identify the exact canonical release revision;
2. recover every bound scene/audio/caption/title/runtime input by durable ID/hash;
3. detect missing or mutated bytes;
4. reconstruct the release candidate deterministically enough to verify semantic/frame identity;
5. restore the prior canonical promotion pointer transactionally;
6. preserve the superseded/newer release as history rather than deleting evidence.

## Drill inputs

```text
release ID + revision
release receipt hash
reel definition revision/hash
scene promotion receipt IDs
resolved-scene hashes
audio/caption/title asset hashes
assembly runtime versions
canonical asset ingest receipts
```

No step may rely on `latest`, local desktop folders, chat history or remembered package versions.

## Reconstruction modes

### Semantic reconstruction

Rebuild the exact resolved scene/reel definitions and verify canonical hashes. This is required across supported Windows/Linux boundaries.

### Frame reconstruction

Render selected canonical proof frames and compare expected semantic/visual evidence according to the render-determinism contract.

### Encoded artifact verification

If the original released MP4 bytes are retained, verify their recorded hash. A fresh cross-platform encode is not required to be byte-identical unless the encode environment is deliberately pinned for that release class.

## Rollback transaction

```text
current release R4
  ↓
rollback request references prior approved R3
  ↓
verify R3 receipts/assets available
  ↓
verify no stale/missing critical input
  ↓
create rollback receipt
  ↓
canonical pointer changes R4 → R3
  ↓
R4 remains retained/superseded, not erased
```

## Failure cases

```text
FAILURE-ROLLBACK-001 prior-receipt-missing
FAILURE-ROLLBACK-002 asset-bytes-no-longer-match
FAILURE-ROLLBACK-003 release-used-latest-reference
FAILURE-ROLLBACK-004 supersedes-cycle
FAILURE-ROLLBACK-005 rollback-deletes-newer-evidence
FAILURE-ROLLBACK-006 package-version-unrecoverable
FAILURE-ROLLBACK-007 reconstructed-scene-hash-mismatch
FAILURE-ROLLBACK-008 human-approval-receipt-does-not-match-release
```

## Scheduled milestone drill

Before the first public V3 release, perform one deliberate dry-run:

```text
promote candidate release
verify release receipt
introduce no byte changes
reconstruct from receipts in clean environment
compare canonical hashes
rollback to previous canonical release
verify Studio/API shows prior canonical and newer superseded history
restore candidate only through a new explicit promotion
```

This should become a milestone test rather than every-commit CI.

## Storage implication

Anything required to reconstruct a canonical release is retention-critical: source receipts, canonical assets, resolved definitions, runtime/package versions, approved bakes, captions/audio and promotion/release receipts. Disposable caches remain disposable.

## Definition of Ready

Ready when a machine-readable rollback drill candidate can name all required inputs without `latest`, and the release specification can represent rollback as a new auditable transaction rather than destructive mutation.
