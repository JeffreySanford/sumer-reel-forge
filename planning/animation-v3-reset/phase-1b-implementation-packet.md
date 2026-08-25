# Phase 1B Implementation Packet — Visual Evidence Foundation

Status: **file-by-file implementation plan / code not started in this packet**

This packet turns the Phase 1 visual-evidence decision into bounded repository work. It is intentionally conservative: the current `historical-sources` library is small, already green, and should not be exploded into architecture for architecture's sake.

## 1. Current baseline

Current library shape:

```text
libs/historical-sources/
  src/index.ts
  src/lib/historical-sources.ts
  src/lib/historical-sources.spec.ts
```

The first slice has already established ETCSL/non-ETCSL bindings, chapter maps, validation and tests.

Phase 1B extends that library without changing animation runtime behavior.

## 2. Objective

Add:

```text
canonical visual-evidence records
project-specific evidence applications
rights state
application validation
first authoritative records
first report/query helpers
stable negative cases
```

Do not add Studio UI, animation engines or image-download automation inside the core Phase 1B library slice.

## 3. Preferred source layout after Phase 1B

Keep compatibility exports while separating concepts only where the file has become meaningfully crowded:

```text
libs/historical-sources/src/lib/
  historical-sources.ts            existing compatibility/public aggregation
  historical-sources.spec.ts       existing baseline tests
  visual-evidence-types.ts
  visual-evidence-registry.ts
  visual-evidence-applications.ts
  visual-evidence-validation.ts
  visual-evidence.spec.ts
  provenance-report.ts
  provenance-report.spec.ts
```

`src/index.ts` remains the intentional public barrel.

Do not split ETCSL types into six files merely because Phase 2 will have more libraries later.

## 4. Slice 1B-A — contract extension

Files:

```text
visual-evidence-types.ts
visual-evidence-validation.ts
visual-evidence.spec.ts
historical-sources.ts compatibility edits
src/index.ts exports
```

Implement:

- `VisualEvidenceBinding` revision field and evidence type;
- `VisualRightsStatus`;
- `VisualEvidenceApplication`;
- `EvidenceTargetRef`;
- `EvidenceRelationship`;
- application-level usages;
- review status;
- staleness reason enum/type.

Required stable IDs:

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

Stop if the contract requires Angular/React/browser/image-loader types.

## 5. Slice 1B-B — authoritative records

Files:

```text
visual-evidence-registry.ts
visual-evidence-applications.ts
historical-sources.ts scholarship record addition
visual-evidence.spec.ts
```

Add canonical records for:

```text
visual:bm:standard-of-ur:1928-1010-3:v1
visual:bm:royal-game-ur:1928-1009-378:v1
visual:met:banquet-seal:56-157-1:v1
```

Add scholarship binding:

```text
scholarship:penn:legrain-al-ubaid-1944:v1
```

Do **not** create a fake Penn museum-object record for the article itself.

## 6. Initial application records

At least:

```text
application:standard-ur:project-social-staging:v1
application:standard-ur:enlil-costume-context:v1
application:standard-ur:procession-context:v1
application:royal-game-ur:decorative-material:v1
application:met-banquet:chapter2-banquet-staging:v1
```

Applications may be `draft/reviewed` until exact target revisions exist. Draft status is valid planning data; it must not masquerade as production approval.

## 7. Slice 1B-C — provenance report/query layer

Files:

```text
provenance-report.ts
provenance-report.spec.ts
```

Planned public queries:

```ts
getVisualEvidence(id)
getVisualEvidenceApplication(id)
getApplicationsForEvidence(evidenceId)
getApplicationsForTarget(target)
getEvidenceForTarget(target)
getRightsWarningsForTarget(target)
getStaleApplications()
createProvenanceSummary()
```

Return data structures, not preformatted HTML.

## 8. Report snapshot

A deterministic report fixture should summarize:

```text
historical source count
ETCSL source count
non-ETCSL source count
visual evidence count
visual application count
applications by relationship
applications by confidence
rights modes
unresolved references
stale applications
research-needed source count
```

No timestamps inside canonical report snapshots unless supplied explicitly by the caller.

## 9. Slice 1B-D — compatibility and cleanup

Only after all consumers compile:

- retain current scalar `usage` compatibility if existing code references it;
- mark legacy-only usage in diagnostics;
- document planned removal version;
- do not change existing source IDs casually;
- keep chapter source-map behavior unchanged.

If no consumer uses scalar usage yet, migration may be simpler, but still record the contract decision in the changelog/ADR trail.

## 10. Exact local edit loop

After each slice:

```bash
pnpm exec nx test historical-sources
pnpm exec nx build historical-sources
```

If the project has/gets an Nx lint target:

```bash
pnpm exec nx eslint:lint historical-sources
```

Before push:

```bash
pnpm workspace:check
pnpm exec nx test historical-sources
pnpm exec nx build historical-sources
pnpm lint
```

Use full `pnpm quality` when the repository quality contract says the coherent implementation batch is ready for the repository-level gate.

## 11. GitHub Actions expectation

CI independently repeats deterministic checks on Linux:

```text
frozen install
workspace check
historical-sources test
historical-sources build
lint/applicable repository quality checks
```

There is no GPU/render requirement for this data-model slice.

## 12. Required positive scenarios

- one Standard of Ur record supports multiple applications;
- each application retains its own relationship/confidence;
- one target can aggregate several evidence sources;
- metadata-only evidence remains queryable;
- public-domain evidence can record rights without implying automatic ingest;
- scholarship source can support an application indirectly without becoming visual object identity;
- deterministic report ordering stable.

## 13. Required negative scenarios

- unknown evidence reference fails;
- unknown target syntax fails;
- unsupported usage fails;
- application with empty inference fails;
- direct relationship + analogical confidence fails;
- article inserted as museum object fails;
- metadata-only image bytes marked promotion-ready fails;
- duplicate evidence ID fails;
- duplicate application ID fails;
- anachronism without explanation/review note fails.

## 14. Review checklist

Before merge:

```text
[ ] no animation runtime imports
[ ] no browser/image-fetch dependency in domain library
[ ] authoritative URLs preserved
[ ] evidence identity not duplicated per scene
[ ] application confidence separate from object confidence
[ ] rights separate from historical confidence
[ ] Penn article represented as scholarship
[ ] stable failure IDs implemented
[ ] report deterministic
[ ] local test/build/lint gate green
[ ] GitHub deterministic gate green
```

## 15. Explicitly deferred

Not Phase 1B core-library work:

```text
museum image downloader
thumbnail cache
Angular provenance cards
Storybook provenance components
Playwright provenance workflow
manual visual-research approval UI
asset promotion UI
```

Those consume the contract after it is stable.

## 16. Exit condition

Phase 1B core is ready when a UI or Scene V3 compiler can consume evidence/application records without inventing historical interpretation, rights policy or target confidence in presentation code.