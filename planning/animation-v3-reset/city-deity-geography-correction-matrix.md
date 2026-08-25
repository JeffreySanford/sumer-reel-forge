# City, Deity, Function and Symbolic-Correspondence Correction Matrix

Status: **final research matrix / production provenance input**  
Research date: **2026-08-25**

This matrix separates four things that the manuscripts sometimes intentionally combine:

1. historical/cult city association;
2. deity's ancient function;
3. project narrative role;
4. later occult/Qabalistic correspondence.

The separation lets the story keep its symbolic architecture without mislabeling a modern correspondence as Sumerian cult geography.

| City / place | Strong historical deity/cult association | Ancient function relevant to project | Manuscript / symbolic issue | Production classification |
|---|---|---|---|---|
| **Eridu** | Enki/Ea; Namma also Eridu pantheon | Abzu, fresh water, wisdom, magic, crafts, civilization | Eridu/Malkuth/Enki is project Tree overlay | historical cult **strong**; Tree mapping `MODERN_SYMBOLIC_CORRESPONDENCE` |
| **Nippur** | Enlil; Ninlil; Ekur/Ekiur | high divine authority, assembly, destiny, kingship legitimacy | Nippur/Chokmah/Enlil is symbolic | historical cult **strong**; Tree mapping modern |
| **Ur** | Nanna/Suen | Moon, calendrical/time associations, city tutelary deity | Ur/Yesod/Nanna aligns Moon↔Moon strongly | historical **strong** + `HIGH_RESONANCE` modern correspondence |
| **Uruk** | Inanna/Ishtar; An also major ancient presence | Venus, love/war, kingship/city identity | manuscript sometimes gives Uttu primary Uruk role | historical patron should be **Inanna**; Uttu retained for weaving |
| **Larsa** | Utu/Shamash | Sun, justice, judgment, boundaries | Larsa/Tiphareth/Utu aligns Sun↔Sun strongly | historical **strong** + `HIGH_RESONANCE` modern correspondence |
| **Sippar** | Utu/Shamash | Sun, justice/divination | not central Tree node | historical **strong** |
| **Kish** | Zababa; Ishtar also prominent later | warfare, royal/city identity | manuscript Kish/Kether/An | historical patron **Zababa**; An/Kether may remain symbolic |
| **Shuruppak** | Sud, later identified with Ninlil | goddess whose marriage to Enlil explains Sud→Ninlil | manuscript gives Shuruppak to Nergal/Geburah | historical mapping should be **Sud/Ninlil**; Nergal/Geburah symbolic only |
| **Kutha** | Meslamtaea/Nergal | underworld, death, plague, war; later Mars association | manuscript sometimes spatially merges Kutha with Ereshkigal's underworld | Nergal/Kutha **strong**; literal underworld city `MYTHIC_SYNTHESIS` |
| **Ereš** | Nisaba/Nidaba | grain, writing, scribal arts, accounting | Chapter 2 relocates Nisaba/Sud scene to Uruk | source geography **Ereš**; Uruk version `DELIBERATE_ADAPTATION` |
| **Girsu / Lagash city-state** | Ningirsu + Baba/Bau | warrior/agricultural city god; Baba protective/healing later | manuscript uses Nergal/Nintud in Lagash-related symbolic structure | historical cult metadata should use Ningirsu/Baba; symbolic pairing separate |
| **Adab** | Mother Goddess/Ninhursag cult attested among others | motherhood, birth, earth/mountain theological identity | Adab/Binah/Ninhursag symbolic Great-Mother analogy | historically plausible/contextual; not her exclusive defining center |
| **Kesh** | Mother Goddess/Ninhursag tradition especially important | Mother Goddess cult center | underused in manuscript | useful corrective/contextual research node |
| **Umma** | Šara is commonly associated; verify final production entry against a dedicated current corpus/object source | regional city-state, agriculture/administration | project Qabalistic pairing requires separate review | `VERIFY_MORE` before canonical cult record |
| **Bad-tibira** | Dumuzi/Inanna traditions important | shepherd/metalwork associations vary by tradition | manuscript uses city in early settlement/dynastic sequence | keep but source by exact period/tradition |
| **Dilmun** | not a Sumerian city-state patron map; mythic/trade geography | fresh-water transformation, trade, abundance | sometimes treated as one timeless geography | direct literary motif strong; archaeological identity chronology-sensitive |

## Primary online authorities

### Enki / Eridu
- https://oracc.museum.upenn.edu/amgg/listofdeities/enki/

### Namma
- https://oracc.museum.upenn.edu/amgg/Listofdeities/Namma/

### Enlil / Nippur
- https://oracc.museum.upenn.edu/amgg/listofdeities/enlil/

### Ninlil / Sud / Shuruppak
- https://oracc.museum.upenn.edu/amgg/listofdeities/ninlil/

### Nisaba / Ereš
- https://oracc.museum.upenn.edu/amgg/listofdeities/nidaba/

### Zababa / Kish
- https://oracc.museum.upenn.edu/amgg/Listofdeities/Zababa/

### Nergal / Kutha
- https://oracc.museum.upenn.edu/amgg/Listofdeities/Nergal/

### Inanna / Uruk / Venus
- https://oracc.museum.upenn.edu/amgg/listofdeities/inanaitar/

### Baba / Girsu / Lagash
- https://oracc.museum.upenn.edu/amgg/Listofdeities/Baba/

## Recommended data rule

Do not store one overloaded field such as:

```ts
city.god = 'Nergal'
```

Prefer independently versioned relationships:

```ts
interface CityReligiousBinding {
  cityId: string;
  deityId: string;
  relationship: 'PATRON' | 'MAJOR_CULT' | 'TEMPLE_ATTESTED' | 'LITERARY_ASSOCIATION';
  periodBand?: string;
  sourceIds: string[];
  confidence: string;
}

interface SymbolicCorrespondence {
  targetId: string;
  symbolicSystem: string;
  symbolicNode: string;
  associatedDeityId?: string;
  rationale: string;
  historicalTransmissionClaim: false;
}
```

Then Chapter 3 can safely express, for example:

```text
Shuruppak
  historical patron → Sud/Ninlil

Geburah symbolic node
  Mars/death/force resonance → Nergal

Nergal historical cult center
  → Kutha
```

without forcing one mapping to falsify another.

## Production recommendation

Before CityKit definitions are marked source-ready, every city should have:

```text
modern archaeological site / coordinates
period band
paleochannel/shoreline confidence
historical deity relationships
major temple names if known
textual associations
visual evidence applications
project symbolic correspondences in a separate layer
```

This matrix should seed that work but should not become a claim that Mesopotamian cult was static across all periods.
