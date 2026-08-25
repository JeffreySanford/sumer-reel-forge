# Phase 1 Completion Design — Provenance Studio UX

Status: **planning contract**

This document defines how literary, historical, archaeological and visual provenance becomes an inspectable part of Sumer Reel Forge Studio before animation-runtime work begins.

The goal is not to turn Studio into an academic citation manager. The goal is to make every production decision capable of answering:

- what manuscript passage is being adapted;
- what ancient literary tradition supports it, if any;
- what archaeological or museum evidence informs the visual reconstruction;
- what portion is authored historical fiction;
- whether a binding is stale, incomplete, analogical or intentionally speculative.

## 1. Phase 1 UX scope

Phase 1 is read-mostly. Editing source records remains in typed registry files/controlled tooling until the domain stabilizes.

Studio Phase 1 surfaces:

1. Source Summary Card
2. Narrative Adaptation Badge
3. Literary Source Detail
4. Visual Evidence Card
5. Provenance Warning Panel
6. Source Staleness Indicator
7. Scene/shot provenance drawer
8. source-filtered search/navigation

No animation dependency is required.

## 2. Source Summary Card

Required fields:

```text
Narrative thread / scene
Manuscript chapter + revision
Adaptation class
Source confidence
Primary literary source
Visual evidence count
Warnings
Last validated registry revision
```

Example:

```text
ENKI — KUTU STORM
Chapter 1 / narrative revision 3

Adaptation: CLOSE PARAPHRASE + FICTIONAL BRIDGE
Literary source: Enki's journey / Kur-related tradition
Visual evidence: 2 contextual records
Confidence: MEDIUM
Warnings: 1 interpretive chronology note
```

The UI must not visually imply that `HIGH confidence` means "historically happened." It means the stated provenance relationship is well supported.

## 3. Adaptation presentation

Canonical labels:

- `DIRECT_SOURCE`
- `CLOSE_PARAPHRASE`
- `COMPOSITE_ADAPTATION`
- `FICTIONAL_BRIDGE`
- `SPECULATIVE_RECONSTRUCTION`
- `INTENTIONAL_ANACHRONISM`

Display copy should be human-readable but preserve machine values in diagnostics.

Every badge requires:

- text label;
- accessible name;
- non-color icon/shape;
- explanatory tooltip/popover;
- Storybook story.

## 4. Literary source detail

For ETCSL:

```text
Source type: ETCSL
Composition ID
Title
Relevant line/range when known
Source URL
Notes on fragment/composite reconstruction
Registry ID
```

For non-ETCSL traditions:

```text
Source type
Work/tradition
Translator/edition where tracked
Reference locator
Registry ID
```

Do not silently normalize non-ETCSL material into ETCSL identifiers.

## 5. Visual Evidence Card

Required fields:

```text
Evidence ID
Institution
Object/site title
Object/accession ID if available
Date / date range
Culture / archaeological phase
Site/provenance
Evidence relationship
License/image-use status
Usage note
```

Evidence relationship vocabulary:

- `DIRECT`
- `ANALOGICAL`
- `CONTEXTUAL`
- `SPECULATIVE`

Example:

```text
Standard of Ur
British Museum
Early Dynastic III
Contextual evidence

Used for:
procession hierarchy, carried goods, animals, banquet staging

Not used as:
proof of the manuscript event itself
```

## 6. Warnings

Warnings must be structured, not prose-only.

Planned codes:

```text
SOURCE_UNRESOLVED
SOURCE_ID_UNKNOWN
ETCSL_CLASSIFICATION_INVALID
LINE_RANGE_INVALID
VISUAL_DATE_MISSING
VISUAL_LICENSE_UNKNOWN
PERIOD_MISMATCH
ANALOGICAL_EVIDENCE
SPECULATIVE_VISUAL
NARRATIVE_STALE
SOURCE_REGISTRY_STALE
VISUAL_EVIDENCE_STALE
INTENTIONAL_ANACHRONISM
```

Severity:

- INFO
- REVIEW
- BLOCKING

A period mismatch is normally REVIEW, not automatically BLOCKING. A nonexistent source ID is BLOCKING.

## 7. Staleness UX

A source card may be valid but stale.

Display distinct states:

```text
CURRENT
NARRATIVE_STALE
SOURCE_STALE
VISUAL_STALE
MULTI_STALE
```

Studio must explain *why* it is stale, e.g.:

```text
Narrative revision changed from 3 → 4 after this binding was validated.
```

No single generic `stale` badge.

## 8. Read-only Phase 1 routes/panels

Planned Studio integration:

```text
Scene Inspector
  └─ Provenance tab

Shot Inspector
  └─ Source summary

Asset Inspector
  └─ Visual evidence

Project / Chapter
  └─ Provenance coverage report
```

## 9. Coverage report

Chapter/project report should classify narrative threads:

```text
BOUND
FICTIONAL_BY_DESIGN
REVIEW_REQUIRED
BLOCKED
STALE
```

Useful metrics:

- number of narrative threads;
- number with literary source bindings;
- number intentionally fictional;
- number with visual evidence;
- unresolved references;
- stale bindings;
- intentional anachronisms.

Do not optimize for "100% ETCSL coverage." Fictional bridges are valid by design.

## 10. Angular component plan

Target components, names provisional:

```text
provenance-source-card
provenance-adaptation-badge
provenance-literary-source
provenance-visual-evidence-card
provenance-warning-list
provenance-staleness-badge
provenance-coverage-summary
```

Components should consume view models derived from `@sumer-reel-forge/historical-sources`, not duplicate source classification logic in Angular.

## 11. Unit tests

For each component:

- renders required fields;
- preserves canonical machine classification;
- handles missing optional fields;
- warning severity mapping;
- accessible label output;
- stale reason output;
- external link state does not invent source metadata;
- fictional bridge does not show a fake ancient source.

Domain library tests additionally cover:

- source ID validation;
- ETCSL/non-ETCSL separation;
- line range validation;
- visual evidence required metadata;
- staleness derivation;
- coverage status derivation.

## 12. Storybook inventory

Required stories:

```text
Historical/SourceCard/ETCSLDirect
Historical/SourceCard/CloseParaphrase
Historical/SourceCard/Composite
Historical/SourceCard/FictionalBridge
Historical/SourceCard/Speculative
Historical/SourceCard/IntentionalAnachronism

Historical/VisualEvidence/Direct
Historical/VisualEvidence/Analogical
Historical/VisualEvidence/Contextual
Historical/VisualEvidence/LicenseUnknown
Historical/VisualEvidence/PeriodMismatch

Historical/Staleness/Current
Historical/Staleness/NarrativeStale
Historical/Staleness/SourceStale
Historical/Staleness/MultiStale

Historical/Coverage/ChapterGreen
Historical/Coverage/ReviewRequired
Historical/Coverage/Blocked
```

Storybook interaction tests:

- keyboard open/close detail;
- warning help text;
- source navigation link focus;
- adaptation explanation;
- screen-reader accessible status text.

## 13. Storybook accessibility gate

Applicable source/provenance stories should run accessibility checks.

Required manual verification at milestone:

- keyboard-only navigation;
- 200% zoom/reflow;
- one screen reader smoke test for card semantics/status text.

## 14. E2E scenarios

### E2E-PROV-001 — inspect ETCSL binding

1. open Chapter 1 scene;
2. open Provenance tab;
3. verify composition title/ID;
4. inspect adaptation class;
5. open source link control;
6. return without losing scene selection.

### E2E-PROV-002 — fictional bridge

1. open authored bridge scene;
2. verify `FICTIONAL_BRIDGE`;
3. verify no fake ETCSL composition is shown;
4. verify scene remains valid.

### E2E-PROV-003 — stale narrative binding

1. load fixture with newer manuscript revision;
2. verify `NARRATIVE_STALE`;
3. verify reason text;
4. verify promotion/review action is appropriately blocked or warned by policy.

### E2E-PROV-004 — visual evidence warning

1. load period-mismatch fixture;
2. verify REVIEW status;
3. verify evidence metadata still visible;
4. verify warning does not mutate the underlying record.

### E2E-PROV-005 — keyboard inspection

Perform core provenance inspection without mouse.

## 15. Lint/build/local-first gate

Before push for Phase 1 UI slice:

```text
historical-sources unit
historical-sources lint
historical-sources build
web affected unit
web affected lint/build
Storybook build/tests for provenance stories
affected Playwright provenance E2E
```

Then GitHub Actions repeats the deterministic subset.

## 16. Failure fixtures

Mandatory negative fixtures:

- fake ETCSL ID;
- Atrahasis mislabeled ETCSL;
- invalid line range;
- visual evidence missing date;
- visual evidence missing institution/object identity;
- intentional anachronism lacking classification;
- stale manuscript revision;
- fictional bridge incorrectly asserting direct source.

The test suite passes by proving these are rejected/warned correctly.

## 17. Phase 1 completion gate

Phase 1 is complete only when:

- source registry remains test/build green;
- at least three real archaeological/museum evidence records exist;
- validation/reporting tool exists;
- Studio renders provenance read-only;
- all adaptation classes have Storybook stories;
- provenance Storybook tests pass locally;
- provenance E2E passes locally;
- applicable lint/build tests pass locally;
- GitHub Actions independently repeats deterministic checks;
- no animation runtime dependency was needed to achieve this phase.
