# Historical Period and Visual Evidence Policy

Status: **planning contract**

Sumer Reel Forge is historical fiction based on ancient literary traditions. The narrative may compress chronology and combine traditions, but the visual system should not collapse all Mesopotamian periods into one undifferentiated “ancient Sumer” style. This document defines how period evidence is selected, labeled and transformed into production design.

## 1. Core distinction

Three timelines may coexist:

```text
MYTHIC / LITERARY TIME
    ancient narrative tradition; often intentionally non-historical

FRAME / NARRATIVE TIME
    the fictional chronology chosen by the manuscript

VISUAL EVIDENCE TIME
    the archaeological date of objects/sites used for reconstruction
```

They are related but not identical.

## 2. Visual evidence is not literal scene documentation

A museum object can support:

- clothing conventions;
- furniture;
- vessels;
- musical instruments;
- procession hierarchy;
- vehicles;
- animal handling;
- architecture/material vocabulary;
- social staging.

It does **not** prove that the fictional/mythic event occurred or that the exact participants looked that way.

## 3. Period bands

Planning vocabulary:

```text
UBAID_CONTEXT
URUK
JEMDET_NASR
EARLY_DYNASTIC_I_II
EARLY_DYNASTIC_III
AKKADIAN
UR_III
OLD_BABYLONIAN
LATER_MESOPOTAMIAN_CONTEXT
MYTHIC_DESIGN_SYNTHESIS
```

Exact archaeological chronology can vary by scholarly convention; registry records store the institution/source’s stated dates instead of forcing all evidence into one oversimplified master date.

## 4. Evidence relationship classes

```text
DIRECT_SITE_PERIOD
NEAR_PERIOD_ANALOGUE
REGIONAL_CONTEXT
LATER_ICONOGRAPHIC_TRADITION
DESIGN_INFERENCE
INTENTIONAL_ANACHRONISM
```

Every prominent reconstruction feature should be able to explain which relationship applies.

## 5. Early Dynastic visual anchor

The British Museum’s Standard of Ur is dated Early Dynastic III, approximately 2550–2400 BCE, from the Royal Cemetery at Ur. Its imagery includes wheeled vehicles, infantry, prisoners, tribute/goods, animals, a banquet, singer and lyre player. It is therefore a powerful **contextual visual anchor** for procession, social hierarchy, vehicles, animals, banquet staging and music—not a literal illustration of Enlil’s council or a manuscript marriage scene.

Registry candidate:

```text
visual:bm:standard-of-ur
institution: British Museum
museum number: 121201
period: Early Dynastic III
date: 2550–2400 BCE
relationship default: NEAR_PERIOD_ANALOGUE / REGIONAL_CONTEXT
source: https://www.britishmuseum.org/collection/object/W_1928-1010-3
```

## 6. Banquet visual anchor

The Metropolitan Museum of Art object 56.157.1 is a Sumerian Early Dynastic III cylinder seal, ca. 2600–2350 BCE, showing a banquet with seated figures drinking through long tubes. The Met marks its image Public Domain.

Useful for:

- banquet seating;
- drinking practice/iconography;
- vessels;
- attendants;
- social composition;
- visual motif research.

Not sufficient alone for reconstructing an entire palace interior.

Registry candidate:

```text
visual:met:banquet-seal-56-157-1
period: Early Dynastic III
date: ca. 2600–2350 BCE
object: 56.157.1
license: Public Domain per Met record
source: https://www.metmuseum.org/art/collection/search/324572
```

## 7. al-‘Ubaid / Ninhursag temple anchor

Penn Museum’s published al-‘Ubaid material describes a Ninhursag temple dated around 2700 BCE with platform/stair access, decorated columns, copper/mosaic treatments, lion-headed eagle imagery, stags, bulls, lions, ducks and rosette decoration.

This is unusually valuable for:

- Ninhursag-associated architectural vocabulary;
- temple platform/approach;
- column decoration;
- animal/divine decorative motifs;
- material richness.

It should be labeled site-specific evidence/analogue, not universally applied to every Sumerian temple.

Source:

```text
https://www.penn.museum/sites/bulletin/2583/
```

## 8. Royal Game of Ur as material/design context

British Museum object 120834, the Royal Game of Ur, is Early Dynastic III, 2600–2400 BCE, from the Royal Cemetery at Ur. Its shell/wood inlay and rosette/eye motifs can inform high-status material vocabulary, furniture/object finish and decorative geometry.

It is not evidence that every elite surface used identical motifs.

Source:

```text
https://www.britishmuseum.org/collection/object/W_1928-1009-378
```

## 9. Frame-era vs myth-era policy

The manuscript may use a later scribal/frame setting while narrating much earlier mythic events. Production design should therefore distinguish:

```text
FRAME STORY VISUALS
    may intentionally use the frame-period evidence profile

MYTHIC RETELLING VISUALS
    use an authored “mythic Sumer” synthesis grounded preferentially in relevant/near-period evidence
```

The frame story should not silently impose all later material culture onto the mythic sequence.

## 10. Mythic synthesis profile

Because the divine stories are not documentary events, the art direction can synthesize evidence while remaining transparent.

A mythic synthesis profile records:

```text
primary evidence periods
secondary analogue periods
explicit speculative elements
divine iconography sources
architecture confidence
costume confidence
technology confidence
intentional anachronisms
```

## 11. Visual evidence weighting

Suggested decision rule:

```text
PROMINENT + STORY-SIGNIFICANT
  → prefer strongest direct/near-period evidence

PROMINENT + MYTHIC/SUPERNATURAL
  → evidence-informed design synthesis, explicitly interpretive

BACKGROUND / LOW SALIENCE
  → contextual evidence + bounded procedural variation acceptable
```

## 12. Divine-character policy

Gods are literary/mythic characters, not archaeological portraits.

For Enki, Enlil, Inanna, Ninhursag, Ereshkigal, etc.:

- use literary attributes and securely identified/related iconography where possible;
- avoid claiming one statue/seal is the definitive portrait unless scholarship supports identification;
- preserve project character identity across scenes once approved;
- allow symbolic/material exaggeration appropriate to historical fiction;
- record iconographic source relationship separately from facial identity design.

## 13. Technology policy

Tools, boats, wheels, weapons, weaving equipment, irrigation and metalwork should receive higher evidence scrutiny because they imply practical historical technology.

A speculative tool that looks impressive can be more misleading than a speculative divine glow.

## 14. Architecture policy

Architecture gets confidence layers:

```text
SITE_PLAN_SUPPORTED
MATERIAL_SUPPORTED
FORM_ANALOGUE
INTERIOR_INFERENCE
DECORATIVE_INFERENCE
MYTHIC_EXAGGERATION
```

Three/R3F geometry should store this metadata at building/asset level where important.

## 15. Costume policy

Hero costume design should preserve continuity while allowing evidence refinement.

Each approved costume profile records:

- evidence period(s);
- visual references;
- status/role interpretation;
- speculative features;
- continuity version.

Changing evidence does not automatically mutate a canonical actor mid-reel; it creates a reviewed costume revision.

## 16. Color caveat

Surviving artifacts may not preserve original color/material appearance. Do not treat current museum surface color as automatic original palette.

Color reconstruction is its own evidence/design inference.

## 17. Research uncertainty UI

Studio should expose:

```text
Evidence: Direct / Near-period / Contextual / Interpretive
Confidence: High / Medium / Low
Period difference: same / near / substantially later
Notes
```

Reviewers should be able to see uncertainty without cluttering the final reel.

## 18. Historical visual Storybook

Planned stories:

```text
Research/Evidence/Direct
Research/Evidence/NearPeriod
Research/Evidence/Contextual
Research/Evidence/Interpretive
Research/Evidence/IntentionalAnachronism
Research/Period/EarlyDynasticToUrIIIWarning
Research/DesignSynthesis/Temple
Research/DesignSynthesis/Costume
```

## 19. Unit tests

- date range required for museum/site evidence where available;
- relationship class required;
- institution/object ID required for museum object;
- `DIRECT_SITE_PERIOD` cannot be inferred from geography alone;
- period mismatch warning emitted by policy rules;
- intentional anachronism must be explicitly declared;
- visual evidence cannot masquerade as literary provenance;
- a literary source cannot silently satisfy visual evidence requirement.

## 20. E2E scenarios

- open scene → inspect visual evidence → see period/relationship;
- substitute later-period evidence → warning appears;
- mark intentional anachronism → warning changes to acknowledged state;
- update visual evidence revision → dependent design marked appropriately stale;
- production review can proceed with contextual evidence only when policy allows and uncertainty is explicit.

## 21. Human review questions

For historically prominent visual design:

- Is the evidence relationship represented honestly?
- Are we importing a later-period convention without noticing?
- Does the reconstruction feel coherent with the project’s chosen mythic visual period?
- Is speculative detail doing narrative work, or just adding pseudo-historical confidence?
- Would a reasonable viewer be misled into thinking an interpretive element is securely attested?

## 22. Source registry seed targets

Phase 1 visual evidence should begin with a small authoritative set rather than hundreds of loose references:

1. British Museum — Standard of Ur, 121201.
2. Met — banquet cylinder seal, 56.157.1.
3. Penn Museum — al-‘Ubaid / Ninhursag temple publication.
4. British Museum — Royal Game of Ur, 120834.
5. Additional site/object records added only when tied to a concrete Chapter 1–3 production question.

## 23. Testing and CI

Historical-evidence rules are ordinary deterministic data validation:

```text
local unit
lint
build
Storybook provenance/evidence states
applicable provenance E2E
  ↓
push
  ↓
GitHub repeats deterministic checks
```

No render is needed just because evidence metadata changes, unless that change causes a canonical visual reconstruction revision.

## 24. Definition of success

The policy is successful if Sumer Reel Forge can make rich, mythic, visually compelling historical fiction while still answering, feature by feature: **what is ancient literary tradition, what is archaeological evidence, what is near-period analogy, and what did we invent on purpose?**
