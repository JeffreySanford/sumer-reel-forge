# Visual Evidence Application Contract

Status: **Phase 1B contract decision / implementation-ready planning**

This document resolves the pressure-test discovered by the first real British Museum, Met and Penn records: **historical evidence identity and project use are different data**.

A museum object should be recorded once. Individual scenes, characters, costumes, cities and props may then apply that evidence for different purposes and at different confidence levels.

## 1. Decision

Adopt three distinct concepts:

```text
HistoricalSourceBinding
  textual / scholarly / archaeological claim provenance

VisualEvidenceBinding
  canonical identity of an object, image, site record or other visual authority

VisualEvidenceApplication
  project-specific statement of how one visual-evidence record may inform one target
```

Do not overload `VisualEvidenceBinding.usage` as the long-term project model.

## 2. Canonical evidence identity

Conceptual contract:

```ts
interface VisualEvidenceBinding {
  id: string;
  revision: number;
  evidenceType: 'museum-object' | 'site-record' | 'excavation-image' | 'published-figure';
  institution: string;
  objectNumber?: string;
  title: string;
  culture?: string;
  dateRange?: string;
  findspot?: string;
  material?: string;
  url: string;
  imageRights: VisualRightsStatus;
  notes?: string;
}
```

The record answers **what is this evidence?** It does not answer **what are we allowed to infer from it in this scene?**

## 3. Application contract

```ts
interface VisualEvidenceApplication {
  id: string;
  revision: number;
  evidenceId: string;
  target: EvidenceTargetRef;
  usage: readonly VisualEvidenceUsage[];
  relationship: EvidenceRelationship;
  confidence: 'high' | 'medium' | 'low' | 'analogical';
  inference: string;
  allowedClaims: readonly string[];
  prohibitedClaims: readonly string[];
  sourceDateRelationship?: 'same-period' | 'near-period' | 'earlier-analogue' | 'later-analogue' | 'undated-context';
  reviewerStatus: 'draft' | 'reviewed' | 'approved' | 'rejected';
  reviewerNote?: string;
}
```

## 4. Evidence targets

```ts
type EvidenceTargetRef =
  | { kind: 'scene'; id: string }
  | { kind: 'actor'; id: string }
  | { kind: 'costume'; id: string }
  | { kind: 'city'; id: string }
  | { kind: 'architecture'; id: string }
  | { kind: 'prop'; id: string }
  | { kind: 'material'; id: string }
  | { kind: 'benchmark'; id: string }
  | { kind: 'project-visual-language'; id: string };
```

The target is semantic. It is never a filesystem path.

## 5. Relationship classes

```ts
type EvidenceRelationship =
  | 'direct'
  | 'near-period-context'
  | 'regional-context'
  | 'type-analogue'
  | 'design-synthesis'
  | 'intentional-anachronism';
```

Definitions:

- `direct` — evidence directly supports the visual claim being made;
- `near-period-context` — broadly appropriate period/context evidence, but not proof of the target itself;
- `regional-context` — relevant Mesopotamian/Sumerian context with weaker target specificity;
- `type-analogue` — analogous object/site/type used to guide reconstruction;
- `design-synthesis` — multiple evidence sources combined into an explicitly interpretive project design;
- `intentional-anachronism` — deliberate deviation preserved as an authored decision, never silently presented as period fact.

## 6. Usage vocabulary

Initial application usages:

```text
costume
headdress
jewelry
architecture
material
surface-decoration
tool
vehicle
animal
ritual
banquet
social-staging
procession
work-practice
music
furnishing
landscape
water-infrastructure
decorative-motif
```

Usage is multi-valued at the application level because one application may legitimately cover closely related uses.

## 7. Rights are independent from evidentiary value

```ts
type VisualRightsStatus =
  | { mode: 'metadata-only'; reason: string }
  | { mode: 'public-domain'; sourceStatement: string }
  | { mode: 'licensed'; licenseId: string; sourceStatement: string }
  | { mode: 'permission-required'; reason: string }
  | { mode: 'unknown'; reason: string };
```

A source can be excellent research evidence while its image bytes remain unavailable for production ingest.

`confidence=high` must never imply `imageRights=public-domain`.

## 8. Standard of Ur example

Canonical evidence:

```text
visual:bm:standard-of-ur:1928-1010-3:v1
```

Possible applications:

```text
application:standard-ur:project-social-staging:v1
  target: project visual language
  usage: social-staging, procession, banquet
  relationship: near-period-context
  confidence: high

application:standard-ur:enlil-costume-context:v1
  target: costume:enlil:council:v1
  usage: costume, jewelry
  relationship: near-period-context
  confidence: medium
```

The second application must explicitly prohibit identifying a Standard-of-Ur figure as Enlil.

## 9. Penn al-‘Ubaid handling

The Leon Legrain article remains a `HistoricalSourceBinding` because it is scholarship/publication context.

A specific photographed object, architectural plan or published figure may become a `VisualEvidenceBinding` only when its identity, source location and rights are separately recorded.

This prevents `publication-masquerades-as-object`.

## 10. Application review state

Evidence identity and application approval are independently revisioned.

Example:

```text
museum record correction
  -> VisualEvidenceBinding revision

new interpretation of how object informs Enlil costume
  -> VisualEvidenceApplication revision
```

Changing one application must not mutate another scene's approved inference.

## 11. Staleness

Application becomes stale when:

- referenced evidence revision is superseded in a materially relevant way;
- target costume/scene/city identity changes;
- rights mode changes so intended byte use is no longer valid;
- application relationship/confidence changes;
- prohibited-claim policy changes.

Staleness reasons:

```text
EVIDENCE_REVISION_STALE
TARGET_REVISION_STALE
RIGHTS_STALE
INTERPRETATION_STALE
REVIEW_STALE
```

Do not use one generic `stale=true` without reason.

## 12. Validation rules

Blocking:

- application ID unique;
- evidence ID resolves;
- target semantic ID syntactically valid;
- at least one usage present;
- inference non-empty;
- `direct` relationship cannot use `analogical` confidence;
- intentional anachronism requires explicit reviewer note;
- production image-byte ingest prohibited for `metadata-only`, `permission-required` or `unknown` rights;
- approved application may not reference rejected evidence record.

Warnings:

- low/analogical confidence on hero identity/costume;
- near-period evidence used for a named architecture reconstruction;
- no prohibited claims supplied for an interpretive/design-synthesis application.

## 13. Stable tests

```text
CONTRACT-EVIDENCE-001-known-evidence-reference
CONTRACT-EVIDENCE-002-application-classification
CONTRACT-EVIDENCE-003-multiple-applications-one-record
CONTRACT-EVIDENCE-004-rights-independent-confidence
CONTRACT-EVIDENCE-005-staleness-reason
FAILURE-EVIDENCE-001-unknown-evidence-id
FAILURE-EVIDENCE-002-unsupported-usage
FAILURE-EVIDENCE-003-unlicensed-image-promoted
FAILURE-EVIDENCE-004-publication-masquerades-as-object
FAILURE-EVIDENCE-005-analogical-evidence-labeled-direct
FAILURE-EVIDENCE-006-missing-inference
FAILURE-EVIDENCE-007-anachronism-without-review-note
```

## 14. Studio representation

Provenance UI should show separate cards/tabs:

```text
Evidence record
  institution / object / date / material / authoritative URL / rights

Application
  target / use / relationship / confidence / inference / allowed claims / prohibited claims / review state
```

A reviewer should never have to infer from one generic `usage` field why an object is attached to a scene.

## 15. Migration from current scalar usage

Phase 1B migration strategy:

1. keep current `VisualEvidenceBinding.usage` readable during transition;
2. introduce canonical evidence + application collections;
3. convert the first real records to applications;
4. add validator warning for legacy scalar-only evidence use;
5. update consumers;
6. remove scalar usage only in an explicit schema revision.

No compatibility break merely to make the type prettier.

## 16. Definition of done

The model is correct when the project can answer separately:

> What historical thing is this?

> Why is this project using it here?

> How direct is that relationship?

> What are we explicitly forbidden from claiming?

> Are we allowed to ingest/display the image bytes?

Those questions must never collapse into one `usage` string.