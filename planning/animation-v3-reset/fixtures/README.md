# Scene V3 Machine-Readable Fixture Candidates

Status: **planning data / not executable production fixtures yet**

This directory contains machine-readable candidates that pressure-test proposed V3 contracts before TypeScript interfaces become authoritative.

They are intentionally valid JSON where possible so implementation can later copy/import/migrate them into real fixture libraries rather than reconstructing examples from Markdown.

## Files

```text
scene-v3/minimal-scene.v3.candidate.json
scene-v3/enki-helm.v3.candidate.json
scene-v3/negative-duplicate-id.v3.candidate.json

evidence/standard-of-ur-applications.v1.candidate.json
canonicalization/canonicalization-cases.v1.candidate.json
rig/enki-registration.v1.candidate.json
```

## Rules

1. These files do not prove the final schemas exist yet.
2. Implementation may require deliberate migration as contract details become concrete.
3. A schema change updates candidates through the schema-change review process, not silently.
4. Negative candidates are supposed to fail once validation exists.
5. Engine-specific implementation objects must not leak into authoring JSON.
6. Logical paths remain semantic/repository-relative; resolved workstation paths belong in diagnostics, not authored canonical data.
7. Planning placeholders such as unresolved Enki measurements must be explicitly labeled and are invalid as production-ready data.

## Scene V3 candidates

### Minimal scene

Purpose:

- smallest positive Scene V3 shape;
- frame/dimension/seed validation;
- canonical serialization baseline;
- source-free synthetic foundation test.

Expected eventual stable test:

```text
CONTRACT-SCENE-001-valid-minimal
```

### Enki at the Helm

Purpose:

- pressure-test a real project scene;
- bind current source-registry IDs;
- exercise actor parentage, performance tracks, material-driver relationships and QA requirements;
- remain consistent with the paper Enki Helm example.

Expected eventual fixture identity:

```text
fixture:benchmark:enki-helm:v1
```

### Duplicate-ID negative

Purpose:

- guarantee validator does not accept duplicate semantic IDs in a uniqueness-required namespace.

Expected test:

```text
CONTRACT-SCENE-004-duplicate-id
```

## Evidence application candidate

`evidence/standard-of-ur-applications.v1.candidate.json` proves the newly selected model:

```text
one canonical evidence identity
  -> multiple project applications
  -> different targets/usages/confidence/inference constraints
```

It deliberately includes both project-wide staging and Enlil-costume-context applications without duplicating the Standard of Ur object record.

## Canonicalization candidate

`canonicalization/canonicalization-cases.v1.candidate.json` lists normalization cases for:

- object key order;
- set-like vs authored array order;
- Windows path normalization;
- absolute-path rejection;
- explicit null semantics;
- runtime/asset hash changes;
- informational diagnostic exclusion;
- invalid numeric values.

Literal expected canonical bytes/SHA-256 values are deferred until Phase 2D freezes the implementation. Once frozen, placeholders are replaced by normative vectors.

## Enki registration candidate

`rig/enki-registration.v1.candidate.json` defines required landmark/region/anchor identities while intentionally leaving source dimensions and pixel coordinates unresolved.

This is deliberate. Planning must not fabricate measurements from an unseen source image. Before it becomes executable registration data:

```text
source hash verified
source dimensions measured
all required landmarks measured/qualified
region rectangles recorded
actor-local origin defined
human overlay review approved
```

## Promotion into executable fixtures

When the corresponding implementation phase begins:

```text
planning candidate
  ↓
validate against implemented contract
  ↓
resolve semantic dependencies
  ↓
replace planning placeholders with measured/normative values
  ↓
assign fixture revision
  ↓
move/copy into executable library
  ↓
unit + canonical hash + negative tests
  ↓
planning copy retired with migration note or retained as historical design evidence
```

Do not let a future implementation test silently use a different object than the example reviewers approved on paper.