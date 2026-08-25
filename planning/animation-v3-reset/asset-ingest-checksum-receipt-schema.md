# Production Asset Ingest and Checksum Receipt Schema

Status: **final pre-implementation planning contract**

This contract defines how external/source/generated files become known production assets without allowing filenames, local folders or mutable staging state to masquerade as identity.

## Core pipeline

```text
external/source/candidate bytes
  ↓
ingest preflight
  ↓
classify asset type + provenance
  ↓
compute SHA-256
  ↓
verify rights/status + source relationship
  ↓
copy/bind canonical logical path
  ↓
write immutable ingest receipt
  ↓
registry reference
```

## Receipt shape

```ts
interface AssetIngestReceipt {
  schemaVersion: '1';
  assetId: string;
  assetRevision: number;
  assetClass: string;
  contentSha256: string;
  byteLength: number;
  mimeType: string;
  canonicalLogicalPath: string;
  sourceAssetIds: string[];
  sourceHashes: string[];
  creationMethod: 'DIRECT_SOURCE' | 'CROP' | 'SEGMENT' | 'INPAINT' | 'GENERATED_CANDIDATE' | 'RUNTIME_EXPORT' | 'PHYSICS_BAKE' | 'AUDIO_RENDER' | 'MANUAL_AUTHORING';
  rightsStatus: string;
  maturity: 'CANDIDATE' | 'QA' | 'APPROVED' | 'PRODUCTION_READY' | 'SUPERSEDED';
  toolchain?: Array<{ tool: string; version: string }>;
  humanApprovalReceiptId?: string;
}
```

Wall-clock timestamp and local source path may exist in audit diagnostics but are not asset semantic identity.

## Ingest invariants

- SHA-256 is computed from exact bytes before canonical registration;
- canonical logical path is repository/storage relative, never `D:\...`;
- changing bytes requires a new revision/hash;
- two logical assets may share bytes only deliberately and remain distinct semantic identities;
- debug masks cannot be assigned production asset classes;
- candidate generation never auto-promotes to production-ready;
- image rights and historical confidence remain separate;
- source chain remains navigable even after ephemeral candidate folders are cleaned.

## Exact-byte staging

When a render stages an ingested asset, expected hash must equal staged hash. A successful filename lookup with different bytes is a hard preflight failure.

## Negative fixtures

```text
FAILURE-INGEST-001 content-hash-mismatch
FAILURE-INGEST-002 absolute-path-as-canonical-identity
FAILURE-INGEST-003 debug-mask-promoted
FAILURE-INGEST-004 missing-source-chain-for-derived-asset
FAILURE-INGEST-005 candidate-auto-promoted
FAILURE-INGEST-006 rights-status-confused-with-confidence
FAILURE-INGEST-007 bytes-changed-without-revision
FAILURE-INGEST-008 unsupported-mime-or-corrupt-file
```

## Studio/CLI behavior

Future ingest UI/CLI should show: semantic ID proposal, exact hash, byte size, source lineage, creation method, rights status, maturity, conflicts and whether identical bytes already exist. Duplicate bytes may be reused, but semantic identity must be an explicit author decision.

## Definition of Ready

Ready when one machine-readable ingest receipt candidate exists, asset classes from the existing taxonomy map cleanly, and Scene V3 asset resolution can depend on receipt/registry identity rather than filesystem discovery.
