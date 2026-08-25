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

performance/enki-blink-natural.v1.candidate.json
physics/kutu-hail-bake.v1.candidate.json
world/eridu-topology.v1.candidate.json
crowd/igigi-crew.v1.candidate.json
receipts/enki-helm-benchmark-proof.v1.candidate.json
trace/enki-helm-frame-101.v1.candidate.json
```

## Rules

1. These files do not prove the final schemas exist yet.
2. Implementation may require deliberate migration as contract details become concrete.
3. A schema change updates candidates through the schema-change review process, not silently.
4. Negative candidates are supposed to fail once validation exists.
5. Engine-specific implementation objects must not leak into authoring JSON.
6. Logical paths remain semantic/repository-relative; resolved workstation paths belong in diagnostics, not authored canonical data.
7. Planning placeholders such as unresolved Enki measurements, hashes, topology geometry or runtime versions must be explicitly labeled and are invalid as production-ready data.

## Scene V3 candidates

`minimal-scene.v3.candidate.json` is the smallest positive Scene V3 shape and future canonical serialization baseline.

`enki-helm.v3.candidate.json` pressure-tests real actor parentage, performance tracks, material drivers and QA requirements.

`negative-duplicate-id.v3.candidate.json` is expected to fail uniqueness validation.

## Evidence and registration candidates

`evidence/standard-of-ur-applications.v1.candidate.json` proves one canonical evidence identity can support multiple project applications without cloning historical-object identity.

`canonicalization/canonicalization-cases.v1.candidate.json` defines normalization edge cases for key order, array semantics, paths, nulls, runtime versions and hashes.

`rig/enki-registration.v1.candidate.json` defines required landmark/region/anchor identities while refusing to fabricate unseen pixel measurements.

## Performance candidate

`performance/enki-blink-natural.v1.candidate.json` pressure-tests a reusable semantic performance clip with exact local frames, semantic eye channels, proof states and runtime-independent timing.

Future stable coverage includes `CONTRACT-PERF-001-valid-clip` and `MOTION-ENKI-001-natural-blink`.

## Physics candidate

`physics/kutu-hail-bake.v1.candidate.json` defines the immutable bake identity expected for a Rapier-authored Kutu storm response while leaving actual simulation/hash data unresolved until a deterministic bake exists.

It must never be treated as a usable bake while placeholder hashes remain.

## World topology candidate

`world/eridu-topology.v1.candidate.json` captures persistent semantic relationships among Eridu water nodes, quay, temple approach, water edge and route edge without inventing final coordinates.

Topology relationships are under test before authored geometry is frozen.

## Crowd candidate

`crowd/igigi-crew.v1.candidate.json` defines seed, count, region, archetype and behavior requirements for the first deterministic work-crowd benchmark, including perfect-sync and overdensity negative modes.

## Benchmark receipt candidate

`receipts/enki-helm-benchmark-proof.v1.candidate.json` deliberately begins in `DEFER` with `NOT_IMPLEMENTED_BLOCKING` because required proof evidence does not exist yet.

This protects planning from turning a schema-shaped object into a false capability claim.

## Forensic trace candidate

`trace/enki-helm-frame-101.v1.candidate.json` is the first end-to-end trace skeleton for the `BLINK_CLOSED` proof frame, connecting narrative/source IDs, semantic inputs and future resolved/render evidence hashes.

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