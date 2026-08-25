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

audio/enlil-council-line.v1.candidate.json
herd/marriage-procession.v1.candidate.json
architecture/eridu-temple-kit.v1.candidate.json
growth/dilmun-transformation.v1.candidate.json
camera/enki-helm-camera.v1.candidate.json
lighting/kutu-storm.v1.candidate.json
montage/city-growth.v1.candidate.json
ingest/enki-editorial.v1.candidate.json
rollback/reel1-rollback-drill.v1.candidate.json
research/ch1-3-source-audit.v1.candidate.json
research/divine-manifestation-ontology.v1.candidate.json
```

## Rules

1. These files do not prove the final schemas exist yet.
2. Implementation may require deliberate migration as contract details become concrete.
3. A schema change updates candidates through the schema-change review process, not silently.
4. Negative candidates are supposed to fail once validation exists.
5. Engine-specific implementation objects must not leak into authoring JSON.
6. Logical paths remain semantic/repository-relative; resolved workstation paths belong in diagnostics, not authored canonical data.
7. Planning placeholders such as unresolved measurements, hashes, topology geometry, runtime versions or historical period bands are explicitly labeled and invalid as production-ready data.
8. A planning fixture may say `DEFER`, `CANDIDATE_NOT_EXECUTABLE` or `UNRESOLVED`; schema-shaped data is never evidence that a capability or historical claim is already proven.
9. Modern symbolic correspondence is never promoted into historical-source evidence without an independent authoritative historical source.
10. Search results are discovery aids; canonical research fixtures bind the underlying corpus, museum, publication or institutional authority.
11. Deity patronage, attested cult presence, narrative office, manifestation and symbolic correspondence remain independently typed; no fixture may collapse them into a single deity/city field.

## Foundation candidates

### Scene V3

`minimal-scene.v3.candidate.json` is the smallest positive Scene V3 shape and future canonical serialization baseline.

`enki-helm.v3.candidate.json` pressure-tests real actor parentage, performance tracks, material drivers and QA requirements.

`negative-duplicate-id.v3.candidate.json` is expected to fail uniqueness validation.

### Evidence / canonicalization / rig registration

`evidence/standard-of-ur-applications.v1.candidate.json` proves one canonical evidence identity can support multiple project applications without cloning historical-object identity.

`canonicalization/canonicalization-cases.v1.candidate.json` defines normalization edge cases for key order, array semantics, paths, nulls, runtime versions and hashes.

`rig/enki-registration.v1.candidate.json` defines required landmark/region/anchor identities while refusing to fabricate unseen pixel measurements.

## Performance and simulation candidates

`performance/enki-blink-natural.v1.candidate.json` pressure-tests a reusable semantic performance clip with exact local frames, semantic eye channels, proof states and runtime-independent timing.

`physics/kutu-hail-bake.v1.candidate.json` defines the immutable bake identity expected for a Rapier-authored Kutu storm response while leaving actual simulation/hash data unresolved until a deterministic bake exists.

`crowd/igigi-crew.v1.candidate.json` defines seed, count, region, archetype and behavior requirements for the first deterministic work-crowd benchmark, including perfect-sync and overdensity negative modes.

`herd/marriage-procession.v1.candidate.json` pressure-tests mixed-species animal identity, gait variation, deterministic procession scheduling and anti-clone behavior.

## World / architecture / growth candidates

`world/eridu-topology.v1.candidate.json` captures persistent semantic relationships among Eridu water nodes, quay, temple approach, water edge and route edge without inventing final coordinates.

`architecture/eridu-temple-kit.v1.candidate.json` defines semantic architecture modules and evidence classes while deliberately leaving final phase geometry unresolved.

`growth/dilmun-transformation.v1.candidate.json` defines the causal BARREN → WATER_INTRODUCED → FIRST_GREEN → CULTIVATED → ABUNDANT sequence without allowing a green filter or camera move to substitute for world-state change.

`montage/city-growth.v1.candidate.json` tests long-timespan semantic segment ordering, fictional elapsed time and continuity anchors independently from frame duration.

## Audio / camera / lighting candidates

`audio/enlil-council-line.v1.candidate.json` defines exact-audio-hash ownership and required phrase/viseme/emphasis/gesture/listener marker families without fabricating an unrecorded line duration.

`camera/enki-helm-camera.v1.candidate.json` makes restrained camera intent and proof constraints inspectable while preserving the rule that camera motion cannot substitute for primary actor action.

`lighting/kutu-storm.v1.candidate.json` defines semantic storm-lighting ownership and motion-safety constraints while leaving final human art-direction values unresolved.

## Evidence / receipt / release candidates

`receipts/enki-helm-benchmark-proof.v1.candidate.json` deliberately begins in `DEFER` with `NOT_IMPLEMENTED_BLOCKING` because required proof evidence does not exist yet.

`trace/enki-helm-frame-101.v1.candidate.json` is the first end-to-end trace skeleton for the `BLINK_CLOSED` proof frame, connecting narrative/source IDs, semantic inputs and future resolved/render evidence hashes.

`ingest/enki-editorial.v1.candidate.json` pressure-tests canonical asset ingest identity, exact-byte SHA-256 ownership, rights status and logical paths while requiring source bytes to be measured rather than invented.

`rollback/reel1-rollback-drill.v1.candidate.json` defines the minimum durable inputs required to reconstruct and roll back a canonical Reel 1 release without `latest`, chat history or mutable local folders.

## Historical research audit candidates

`research/ch1-3-source-audit.v1.candidate.json` pressure-tests the final research classification layer across direct text, cult history, archaeology, adaptation, mythic synthesis, modern symbolic correspondence and anachronism.

`research/divine-manifestation-ontology.v1.candidate.json` pressure-tests the distinction among patron deity, attested cult/offering presence, narrative office, project manifestation, historical syncretism and modern symbolic correspondence. Its Kish/Shuruppak/Uttu–Inanna–Ishtar/Lilith examples are intentionally difficult cases for Phase 1B.

Representative intended behaviors:

```text
Enki / Eridu / Abzu
  → DIRECT_TEXTUAL + CULTIC_HISTORICAL

Dilmun fresh water / emporium
  → DIRECT_TEXTUAL

Shuruppak / Nergal
  → historical patron Sud/Ninlil
  + intentional Nergal/Geburah functional-symbolic assignment

Kish / An
  → historical patron Zababa
  + An offering/cult presence
  + An/Kether symbolic assignment

Uttu / Inanna
  → separate ancient named figures
  + textual textile-function bridge
  + PROJECT_METAPHYSICS manifestation relationship

Inanna / Ishtar
  → HISTORICAL_SYNCRETISM

Lilith relation to Inanna/Ishtar
  → MODERN_SYMBOLIC_CORRESPONDENCE, historicalIdentityClaim=false

Bronze Age lemon
  → ANACHRONISTIC

Tree of Life as ancient Sumerian system
  → MODERN_SYMBOLIC_CORRESPONDENCE
```

The research candidates are not a complete sentence-by-sentence manuscript database. They establish machine-readable classification shapes that later research records should follow.

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

For historical research candidates, promotion additionally requires:

```text
discovery search result
  ↓
open underlying authority
  ↓
record exact source/object/composition identity
  ↓
period relationship
  ↓
classification + confidence
  ↓
optional manuscript/visual application
```

Do not let a future implementation test silently use a different object, source tradition, historical period or symbolic system than the example reviewers approved on paper.
