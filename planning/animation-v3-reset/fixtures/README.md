# Scene V3 Machine-Readable Fixture Candidates

Status: **planning data / not executable production fixtures yet**

This directory contains JSON candidates that pressure-test the proposed Scene V3 contract before Phase 2 TypeScript interfaces become authoritative.

They are intentionally stored as valid JSON so implementation can later copy/import/migrate them into `libs/animation-fixtures` rather than reconstructing examples from Markdown.

## Files

```text
scene-v3/minimal-scene.v3.candidate.json
scene-v3/enki-helm.v3.candidate.json
scene-v3/negative-duplicate-id.v3.candidate.json
```

## Rules

1. These files do not prove the schema exists yet.
2. Phase 2A may require deliberate migration of these candidates as contract details become concrete.
3. A schema change should update the candidates through the schema-change review process, not silently.
4. The negative candidate is supposed to fail once validation exists.
5. Engine-specific implementation objects must not leak into these JSON documents.
6. Paths should remain semantic IDs; resolved workstation paths belong in resolved-scene/evidence output, not authoring data.

## Candidate A — minimal scene

Purpose:

- smallest positive Scene V3 shape;
- frame/dimension/seed validation;
- canonical serialization baseline;
- source-free synthetic foundation test.

Expected eventual stable test:

```text
CONTRACT-SCENE-001-valid-minimal
```

## Candidate B — Enki at the Helm

Purpose:

- pressure-test a real project scene;
- bind actual current source registry IDs;
- exercise actor parentage, performance tracks, material driver relationship and QA requirements;
- remain consistent with the paper Enki Helm example while using current registry naming where possible.

This candidate references future semantic runtime/asset IDs that Phase 2 does not yet implement. It is an **authoring-shape candidate**, not a promise that resolution succeeds in Phase 2 without fixture registries.

Expected eventual fixture identity:

```text
fixture:benchmark:enki-helm:v1
```

## Candidate C — duplicate ID failure

Purpose:

- guarantee validator does not accept two objects with the same semantic ID in a namespace where uniqueness is required;
- provide one machine-readable negative fixture from day one.

Expected eventual stable test:

```text
CONTRACT-SCENE-004-duplicate-id
```

## Promotion into executable fixtures

When Phase 2E begins:

```text
planning candidate
  ↓
validate against implemented Scene V3 schema
  ↓
resolve all semantic test registry dependencies
  ↓
assign fixture revision
  ↓
move/copy into libs/animation-fixtures
  ↓
unit + canonical hash tests
  ↓
planning copy either retired with migration note or kept as historical design evidence
```

Do not let a future implementation test silently use a different object than the example reviewers approved on paper.