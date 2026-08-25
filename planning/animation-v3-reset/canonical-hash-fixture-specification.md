# Canonical Hash Fixture Specification

Status: **Phase 2D canonicalization contract / implementation planning**

Canonical hashes are the bridge between authored intent and exact resolved-scene evidence. They must be stable across the supported Windows local / Linux CI boundary without pretending encoded MP4 bytes are cross-platform identical.

## 1. Hash scope

Canonical hash applies to deterministic structured production data such as:

```text
resolved Scene V3
registered asset bindings
runtime versions
semantic seed bindings
approved physics bake references
source/evidence revisions
proof fixture identity
```

It does not automatically hash temporary cache paths, wall-clock timestamps or machine-local diagnostics into semantic identity.

## 2. Algorithm decision

Use SHA-256 for canonical content hashes unless a later ADR explicitly changes the versioned contract.

Rationale:

- repository already uses SHA-256 for asset evidence;
- cryptographic collision resistance is appropriate for evidence binding;
- widely available on Node and CI;
- easy to compare/read in receipts.

The important design work is the canonical byte sequence **before** SHA-256.

## 3. Versioned canonical form

Name the normalization contract:

```text
scene-canonical-form:v1
```

Receipts record both:

```text
canonicalFormVersion
hashAlgorithm
```

A future canonicalization change creates `v2`; it never silently changes old hashes.

## 4. Pipeline

```text
ResolvedSceneV3
  ↓
semantic normalization
  ↓
canonical value tree
  ↓
canonical JSON serialization
  ↓
UTF-8 bytes
  ↓
SHA-256
```

Normalization and serialization are separately testable.

## 5. Semantic normalization rules

### Exclude machine-local data

Never include in canonical semantic hash:

```text
absolute local path
Windows drive letter
OS-specific temp directory
cache location
process ID
wall-clock generation time
hostname
username
GitHub runner workspace path
```

Those may exist in diagnostics/receipts outside the semantic hash payload.

### Logical paths

When logical paths are part of resolved identity:

- use `/` separators;
- reject `..` traversal in canonical logical paths;
- no drive prefixes;
- normalize redundant `./`;
- do not case-fold unless the logical-path contract explicitly says paths are case-insensitive.

### Undefined

`undefined` is forbidden in canonical data.

Optional fields are either:

- omitted according to schema semantics; or
- explicitly `null` when null has meaning.

Do not let serializer behavior decide this accidentally.

## 6. Object ordering

Canonical serialized object keys use deterministic lexical ordering by Unicode code-point/string comparison as defined by the implementation contract.

Insertion order is never trusted.

Two objects with the same semantic fields in different construction order must hash identically.

## 7. Array ordering

Arrays divide into two classes.

### Authored-order arrays

Order is semantic and must be preserved:

```text
performance tracks when precedence/order matters
montage segments
ordered keyframes
ordered events
layer stack where ordering is visual meaning
```

### Set-like/reference arrays

When schema declares order non-semantic, normalize by a stable key such as semantic ID before serialization:

```text
capability declarations
source-reference sets
evidence-reference sets
certain registry summaries
```

Do not sort arrays generically. Schema owns whether order means something.

## 8. Numeric rules

Persisted frame coordinates remain integers.

Canonical numeric data must reject:

```text
NaN
Infinity
-Infinity
negative zero ambiguity where the schema does not distinguish it
```

Floating values allowed by spatial/material contracts require deterministic JSON number serialization and bounded precision rules if cross-runtime evidence shows a need.

Do not round arbitrary scene values merely to make tests pass.

## 9. String rules

- canonical encoding UTF-8;
- JSON escaping deterministic;
- line endings inside normalized generated text use `\n` where a field is explicitly multiline text;
- semantic IDs are stored exactly as validated;
- user-facing notes are not automatically canonical-hash-critical unless the schema marks them as production-semantic.

## 10. Hash-critical vs informational fields

Resolved contracts should mark/define which fields participate in semantic hash.

Hash-critical examples:

```text
scene ID/revision
fps/duration/dimensions
resolved source/evidence revisions
asset IDs + content hashes
runtime IDs + exact versions
semantic seeds
tracks/drivers
world state
physics bake hash
QA contract IDs when they define required production acceptance
```

Potential informational/non-critical examples:

```text
local diagnostic path
human-readable compiler timing
machine hostname
render duration
non-semantic explanatory message
```

This distinction must be contract-driven, not ad hoc deletion before hashing.

## 11. Fixture classes

Create canonicalization fixture cases for:

```text
KEY_ORDER
SET_ARRAY_ORDER
AUTHORED_ARRAY_ORDER
WINDOWS_PATH_NORMALIZATION
OPTIONAL_FIELD_OMISSION
NULL_PRESERVATION
NEGATIVE_ZERO
INVALID_NAN
UNICODE_TEXT
NESTED_OBJECT_ORDER
RUNTIME_VERSION_CHANGE
ASSET_HASH_CHANGE
UNRELATED_DIAGNOSTIC_CHANGE
```

## 12. Expected behavior examples

These two inputs should normalize/hash the same:

```json
{"sceneId":"scene:test","revision":1,"assets":[{"id":"asset:b"},{"id":"asset:a"}]}
```

and, **only if `assets` is schema-declared set-like**:

```json
{"revision":1,"assets":[{"id":"asset:a"},{"id":"asset:b"}],"sceneId":"scene:test"}
```

But these authored keyframes must remain different if order is meaningful:

```json
{"keyframes":[{"frame":0},{"frame":10}]}
```

versus

```json
{"keyframes":[{"frame":10},{"frame":0}]}
```

The latter may also fail schema validation.

## 13. Cross-platform fixture

Phase 2D must pin at least one real canonical fixture containing:

- semantic IDs;
- source/evidence refs;
- asset content hashes;
- runtime versions;
- logical paths;
- seed bindings;
- nested arrays/objects.

Developer records:

```text
expected canonical UTF-8 fixture bytes/file
expected SHA-256
Windows local SHA-256
Linux CI SHA-256
```

All must match.

## 14. Stable tests

```text
CONTRACT-SCENE-015-canonical-order
CONTRACT-SCENE-016-resolved-hash-repeatable
CONTRACT-HASH-001-object-key-order
CONTRACT-HASH-002-set-array-order
CONTRACT-HASH-003-authored-array-preserved
CONTRACT-HASH-004-path-normalized
CONTRACT-HASH-005-undefined-forbidden
CONTRACT-HASH-006-informational-fields-excluded
CONTRACT-HASH-007-runtime-version-affects-hash
CONTRACT-HASH-008-asset-hash-affects-hash
FAILURE-HASH-001-nan
FAILURE-HASH-002-infinity
FAILURE-HASH-003-absolute-path
FAILURE-HASH-004-unversioned-canonical-form
```

## 15. Diff diagnostics

When hashes differ, diagnostics should be able to report canonical-path differences rather than only:

```text
expected abc...
received def...
```

Desired compiler/debug output:

```text
/assets/3/sha256 changed
/runtimes/1/version changed
/performances/2/startFrame changed
```

Do not include those diagnostics in the canonical semantic hash.

## 16. Scene revision relationship

A scene revision change generally affects resolved hash because revision is production identity.

If canonical payload bytes happen to remain otherwise identical, the revision field still distinguishes the resolved production revision unless an ADR explicitly creates content-address-only identity.

## 17. Receipt binding

Render/proof/promotion receipts record:

```text
canonicalFormVersion
hashAlgorithm
resolvedSceneHash
sourceSceneHash
asset hashes
runtime versions
```

Promotion verifies the candidate being approved resolves to the same hash-bound inputs.

## 18. No MP4-byte overclaim

Canonical scene hash guarantees structured production input identity.

It does not claim:

```text
Windows FFmpeg H.264 bytes == Linux FFmpeg H.264 bytes
```

The released encoded artifact gets its own actual file SHA-256.

## 19. Stop conditions

Phase 2D does not merge if:

- Windows/Linux canonical fixture hashes differ;
- absolute machine paths enter semantic payload;
- array order semantics are ambiguous;
- runtime versions are broad/unresolved;
- unsupported values are silently stringified;
- normalization discards semantically meaningful data to force equality.

## 20. Definition of success

Given the same resolved semantic production state, any supported environment produces the same canonical UTF-8 payload and SHA-256. Given a meaningful source/asset/runtime/scene change, the canonical hash changes for an explainable reason.