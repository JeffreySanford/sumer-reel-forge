# Historical Visual Research Workflow

Status: **planning contract**

This document defines how historical/archaeological visual research supports the fiction without becoming false certainty. ETCSL and other ancient literature establish literary provenance; museums, archaeology and scholarship establish visual/material evidence.

## 1. Research question first

Every visual research task begins with a concrete production question, for example:

```text
What did an Early Dynastic banquet arrangement plausibly look like?
What kinds of wheeled vehicles are appropriate for a procession?
What visual evidence exists for temple columns/facades?
What clothing/status distinctions can be supported?
What tools are plausible for canal or agricultural labor?
```

Avoid collecting attractive ancient-looking imagery without a defined use.

## 2. Evidence hierarchy

Preferred order:

1. securely provenanced archaeological object/site from relevant region/period;
2. museum publication/object record;
3. excavation/site report;
4. scholarly synthesis;
5. near-period analogical evidence;
6. broader Mesopotamian contextual evidence;
7. explicitly speculative design inference.

## 3. Literary vs visual separation

Never infer visual fact solely from an ETCSL literary passage unless the passage itself describes the visible feature and interpretation is reasonable.

Never use a museum object to claim an unrelated mythic event happened.

## 4. Research record

Conceptual:

```ts
interface VisualResearchRecord {
  id: string;
  question: string;
  chapterThreads: string[];
  findings: VisualEvidenceFinding[];
  synthesis: string;
  unresolvedQuestions: string[];
  recommendedUsage: string[];
  prohibitedOverclaims: string[];
}
```

## 5. Evidence finding

```ts
interface VisualEvidenceFinding {
  evidenceId: string;
  institutionOrPublication: string;
  objectOrSite: string;
  dateRange?: string;
  culture?: string;
  site?: string;
  relationship: 'DIRECT' | 'ANALOGICAL' | 'CONTEXTUAL' | 'SPECULATIVE';
  supports: string[];
  doesNotSupport: string[];
  licenseStatus?: string;
}
```

## 6. Period labeling

Always capture date/phase when known.

If production chronology is mythic/composite, visual evidence can still be period-bounded and labeled.

Warnings apply when:

- evidence is significantly later/earlier;
- site is geographically distant;
- iconography represents different cultural context.

Warnings do not automatically forbid use; they require intentional classification.

## 7. Visual design synthesis

Design synthesis may combine multiple evidence records.

Example:

```text
banquet staging
  ← Early Dynastic banquet seal
  + Standard of Ur social hierarchy
  + vessel/object evidence
  + fictional scene blocking
```

The final image is a historical-fiction reconstruction, not a reproduction of one artifact.

## 8. Divine iconography

For gods/goddesses, distinguish:

- textual attributes;
- iconographic attributes securely associated with deity;
- later associations;
- authorial design motifs.

Record which category each visual motif comes from.

## 9. Architecture workflow

For temples/cities:

```text
site/period
plan/footprint evidence
materials
facade/column evidence
platform/stair evidence
reconstructed unknowns
art direction
```

Three/R3F geometry should be tagged with evidence/interpretation metadata when reconstruction is significant.

## 10. Costume workflow

Research:

```text
figure type/status
period
material/textile evidence
statue/seal depiction
uncertainty
production simplification
```

Hero costumes should not drift between scenes without an authored wardrobe/version reason.

## 11. Technology/tools workflow

For ploughs, boats, measuring tools, bricks, metallurgy, weaving, canal work:

- capture direct object/depiction where possible;
- note functional reconstruction;
- distinguish narrative exaggeration/mythic technology;
- bind important props to evidence IDs.

## 12. Animal evidence

For herds/processions:

- species presence/plausibility;
- depiction style;
- domesticated vs wild;
- harness/handling evidence;
- explicit mythic/exotic gifts where source itself lists animals.

Do not visually normalize every listed animal into a modern zoo depiction without research.

## 13. CityKit evidence profiles

Each CityKit definition should eventually include:

```text
literary identity sources
archaeological site references
architecture evidence
industry/tool evidence
water/agriculture evidence
visual motifs
uncertainty notes
```

## 14. Research-to-asset trace

```text
research question
  ↓
evidence records
  ↓
design synthesis note
  ↓
asset/rig/world definition
  ↓
Scene V3
```

## 15. Evidence reuse

Evidence records are reusable.

One Standard of Ur record may support:

- procession staging;
- social rank composition;
- goods/animals;
- banquet staging;

but each usage note must be explicit.

## 16. License/image-use policy

Record whether museum image itself may be copied, transformed or only consulted.

If license is unclear:

- use as research reference only;
- do not package the museum image as production asset;
- mark `LICENSE_UNKNOWN`/review state.

## 17. AI-assisted research

AI/web search may help discover sources, but canonical evidence registry should record the actual institution/publication source rather than an AI summary.

AI inference is not an evidence record.

## 18. Research review classes

```text
READY
READY_WITH_ANALOGY
SPECULATIVE_APPROVED
MORE_RESEARCH
BLOCKED_LICENSE
BLOCKED_CONFLICT
```

## 19. Storybook provenance stories

Visual evidence components should demonstrate:

- direct object evidence;
- analogical evidence;
- contextual evidence;
- period mismatch;
- license unknown;
- speculative design synthesis.

## 20. Unit tests

- evidence record required fields;
- relationship classification;
- date/license warning logic;
- source/evidence IDs resolve;
- visual design reference cannot claim direct evidence if only contextual inputs exist;
- intentional anachronism explicitly marked.

## 21. E2E workflow

Future Studio:

1. open visual asset/world element;
2. inspect evidence list;
3. open synthesis note;
4. see warnings;
5. navigate back to scene;
6. verify evidence state persists.

## 22. Research completeness

A visually important historical reconstruction is ready when:

- question is explicit;
- evidence records identified;
- uncertainty classified;
- design synthesis documented;
- licensing status understood;
- asset/world binding planned;
- no claim exceeds evidence classification.

## 23. Relationship to the manuscript

The manuscript remains fiction and may change. When a scene changes materially:

- re-evaluate which evidence is still relevant;
- preserve old evidence history where useful;
- do not force the scene to match an artifact if story intentionally chooses a different, documented interpretation.

## 24. Goal

The viewer should experience a coherent, convincing Sumerian-inspired world. Internally, the project should be able to distinguish what came from ancient literature, what came from archaeology, what is analogical reconstruction, and what Jeffrey deliberately invented for the story.
