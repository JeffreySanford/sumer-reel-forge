export type SourceType =
  | 'etcsl'
  | 'ancient-text-other'
  | 'museum-object'
  | 'archaeology'
  | 'modern-scholarship'
  | 'manuscript';

export type AdaptationClass =
  | 'direct-source'
  | 'close-paraphrase'
  | 'composite-adaptation'
  | 'fictional-bridge'
  | 'speculative-reconstruction'
  | 'intentional-anachronism';

export type SourceConfidence = 'high' | 'medium' | 'interpretive';
export type ResearchStatus = 'verified' | 'needs-research';
export type ValidationSeverity = 'error' | 'warning';

export interface HistoricalSourceBinding {
  id: string;
  sourceType: SourceType;
  title: string;
  authorOrInstitution?: string;
  url?: string;
  compositionId?: string;
  lineStart?: number;
  lineEnd?: number;
  ancientWitnessNote?: string;
  adaptation: AdaptationClass;
  confidence: SourceConfidence;
  researchStatus: ResearchStatus;
  notes?: string;
}

export type VisualEvidenceUsage =
  | 'costume'
  | 'architecture'
  | 'tool'
  | 'vehicle'
  | 'animal'
  | 'ritual'
  | 'social-staging'
  | 'decorative-motif';

export interface VisualEvidenceBinding {
  id: string;
  institution: string;
  objectNumber?: string;
  title: string;
  culture: string;
  dateRange?: string;
  findspot?: string;
  material?: string;
  url: string;
  imageLicense?: string;
  usage: VisualEvidenceUsage;
  confidence: 'high' | 'medium' | 'analogical';
  notes?: string;
}

export interface NarrativeThreadBinding {
  id: string;
  title: string;
  adaptation: AdaptationClass;
  sourceIds: string[];
  claimsHistoricalBasis: boolean;
  notes?: string;
}

export interface ChapterSourceMap {
  id: string;
  title: string;
  manuscriptFile: string;
  manuscriptRevision: string;
  threads: NarrativeThreadBinding[];
}

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface EtcslComposition {
  compositionId: string;
  title: string;
  translationUrl: string;
  catalogueUrl: string;
  themes: string[];
}

const ETCSL_CATALOGUE_URL =
  'https://etcsl.orinst.ox.ac.uk/edition2/etcslfullcat.php';

export const ETCSL_COMPOSITIONS: readonly EtcslComposition[] = [
  {
    compositionId: '1.1.1',
    title: 'Enki and Ninhursaga',
    translationUrl:
      'https://etcsl.orinst.ox.ac.uk/cgi-bin/etcsl.cgi?text=t.1.1.1',
    catalogueUrl: ETCSL_CATALOGUE_URL,
    themes: ['Dilmun', 'Ninhursag', 'fertility', 'healing'],
  },
  {
    compositionId: '1.1.2',
    title: 'Enki and Ninmah',
    translationUrl:
      'https://etcsl.orinst.ox.ac.uk/cgi-bin/etcsl.cgi?text=t.1.1.2',
    catalogueUrl: ETCSL_CATALOGUE_URL,
    themes: ['creation', 'labor', 'Ninmah'],
  },
  {
    compositionId: '1.1.3',
    title: 'Enki and the world order',
    translationUrl:
      'https://etcsl.orinst.ox.ac.uk/cgi-bin/etcsl.cgi?text=t.1.1.3',
    catalogueUrl: ETCSL_CATALOGUE_URL,
    themes: [
      'cities',
      'agriculture',
      'craft',
      'rain',
      'boundaries',
      'weaving',
      'divine functions',
    ],
  },
  {
    compositionId: '1.1.4',
    title: "Enki's journey to Nibru",
    translationUrl:
      'https://etcsl.orinst.ox.ac.uk/cgi-bin/etcsl.cgi?text=t.1.1.4',
    catalogueUrl: ETCSL_CATALOGUE_URL,
    themes: ['Eridu', 'E-engura', 'boat', 'Nibru', 'temple'],
  },
  {
    compositionId: '1.2.1',
    title: 'Enlil and Ninlil',
    translationUrl:
      'https://etcsl.orinst.ox.ac.uk/cgi-bin/etcsl.cgi?text=t.1.2.1',
    catalogueUrl: ETCSL_CATALOGUE_URL,
    themes: ['Enlil', 'Ninlil', 'courtship', 'netherworld'],
  },
  {
    compositionId: '1.2.2',
    title: 'Enlil and Sud',
    translationUrl:
      'https://etcsl.orinst.ox.ac.uk/cgi-bin/etcsl.cgi?text=t.1.2.2',
    catalogueUrl: ETCSL_CATALOGUE_URL,
    themes: ['Sud', 'Nisaba', 'Nuska', 'marriage', 'marriage gifts'],
  },
  {
    compositionId: '1.4.1',
    title: "Inana's descent to the nether world",
    translationUrl:
      'https://etcsl.orinst.ox.ac.uk/cgi-bin/etcsl.cgi?text=t.1.4.1',
    catalogueUrl: ETCSL_CATALOGUE_URL,
    themes: ['Inana', 'Ereshkigal', 'netherworld', 'death', 'rebirth'],
  },
  {
    compositionId: '1.7.6',
    title: 'How grain came to Sumer',
    translationUrl:
      'https://etcsl.orinst.ox.ac.uk/cgi-bin/etcsl.cgi?text=t.1.7.6',
    catalogueUrl: ETCSL_CATALOGUE_URL,
    themes: ['grain', 'agriculture', 'civilization'],
  },
] as const;

export const NON_ETCSL_ANCIENT_SOURCES: readonly HistoricalSourceBinding[] = [
  {
    id: 'ancient-atramhasis-igigi-labor',
    sourceType: 'ancient-text-other',
    title: 'Atrahasis tradition — Igigi labor',
    adaptation: 'composite-adaptation',
    confidence: 'medium',
    researchStatus: 'needs-research',
    notes:
      'Present in Chapter 3 through a modern translation tradition. Must not be labeled ETCSL. Add exact edition/pages before production use.',
  },
  {
    id: 'ancient-adapa-tradition',
    sourceType: 'ancient-text-other',
    title: 'Adapa tradition',
    adaptation: 'composite-adaptation',
    confidence: 'medium',
    researchStatus: 'needs-research',
    notes:
      'Present in Chapter 3 but outside the ETCSL corpus. Add exact ancient/modern edition binding before production use.',
  },
] as const;

export const ETCSL_SOURCE_BINDINGS: readonly HistoricalSourceBinding[] =
  ETCSL_COMPOSITIONS.map((composition) => ({
    id: `etcsl-${composition.compositionId}`,
    sourceType: 'etcsl' as const,
    title: composition.title,
    authorOrInstitution: 'Oxford Electronic Text Corpus of Sumerian Literature',
    url: composition.translationUrl,
    compositionId: composition.compositionId,
    adaptation: 'composite-adaptation' as const,
    confidence: 'high' as const,
    researchStatus: 'verified' as const,
  }));

export const HISTORICAL_SOURCE_REGISTRY: readonly HistoricalSourceBinding[] = [
  ...ETCSL_SOURCE_BINDINGS,
  ...NON_ETCSL_ANCIENT_SOURCES,
] as const;

export const CHAPTER_SOURCE_MAPS: readonly ChapterSourceMap[] = [
  {
    id: 'chapter-01-enki',
    title: 'Chapter 1 - Enki',
    manuscriptFile: 'Chapter 1 - Enki.docx',
    manuscriptRevision: 'original-pre-ai-manuscript',
    threads: [
      {
        id: 'ch1-dilmun-water',
        title: 'Dilmun, Ninsikila, water and city viability',
        adaptation: 'close-paraphrase',
        sourceIds: ['etcsl-1.1.1'],
        claimsHistoricalBasis: true,
      },
      {
        id: 'ch1-world-order-canals',
        title: 'Canals, fields, waterways and city functions',
        adaptation: 'composite-adaptation',
        sourceIds: ['etcsl-1.1.3'],
        claimsHistoricalBasis: true,
      },
      {
        id: 'ch1-eridu-nibru',
        title: 'E-engura, Eridu and journey to Nibru',
        adaptation: 'close-paraphrase',
        sourceIds: ['etcsl-1.1.4'],
        claimsHistoricalBasis: true,
      },
      {
        id: 'ch1-martu-journey',
        title: 'Martu encounters and connective travel narrative',
        adaptation: 'fictional-bridge',
        sourceIds: [],
        claimsHistoricalBasis: false,
        notes: 'Research related Martu traditions separately before claiming an ancient-text basis.',
      },
      {
        id: 'ch1-kutu-storm',
        title: 'Kutu storm and underworld connective narrative',
        adaptation: 'composite-adaptation',
        sourceIds: ['etcsl-1.4.1'],
        claimsHistoricalBasis: true,
        notes: 'Current manuscript combines ancient underworld motifs with authored travel/storm connective fiction.',
      },
    ],
  },
  {
    id: 'chapter-02-enlil',
    title: 'Chapter 2 - Enlil',
    manuscriptFile: 'Chapter 2 - Enlil.docx',
    manuscriptRevision: 'original-pre-ai-manuscript',
    threads: [
      {
        id: 'ch2-grand-council',
        title: 'Stagnant society, Grand Council and Enlil break',
        adaptation: 'fictional-bridge',
        sourceIds: [],
        claimsHistoricalBasis: false,
      },
      {
        id: 'ch2-sud-courtship',
        title: 'Enlil and Sud courtship, grievance and mediation',
        adaptation: 'close-paraphrase',
        sourceIds: ['etcsl-1.2.2'],
        claimsHistoricalBasis: true,
      },
      {
        id: 'ch2-marriage-gifts',
        title: 'Marriage gifts, herds and procession',
        adaptation: 'direct-source',
        sourceIds: ['etcsl-1.2.2'],
        claimsHistoricalBasis: true,
      },
      {
        id: 'ch2-enlil-ninlil',
        title: 'Enlil and Ninlil traditions',
        adaptation: 'composite-adaptation',
        sourceIds: ['etcsl-1.2.1', 'etcsl-1.2.2'],
        claimsHistoricalBasis: true,
      },
      {
        id: 'ch2-long-journey',
        title: 'Long migration and 144,000-year journey montage',
        adaptation: 'speculative-reconstruction',
        sourceIds: [],
        claimsHistoricalBasis: false,
        notes: 'Treat as historical-fiction montage unless specific sources are attached later.',
      },
    ],
  },
  {
    id: 'chapter-03-cities',
    title: 'Chapter 3 - The Cities',
    manuscriptFile: 'Chapter 3 - The Cities.docx',
    manuscriptRevision: 'original-pre-ai-manuscript',
    threads: [
      {
        id: 'ch3-city-functions',
        title: 'City functions, divine assignments, trades and agriculture',
        adaptation: 'close-paraphrase',
        sourceIds: ['etcsl-1.1.3'],
        claimsHistoricalBasis: true,
      },
      {
        id: 'ch3-ninhursag-enki',
        title: 'Enki and Ninhursag generational/fertility material',
        adaptation: 'composite-adaptation',
        sourceIds: ['etcsl-1.1.1'],
        claimsHistoricalBasis: true,
      },
      {
        id: 'ch3-enki-ninmah',
        title: 'Enki, Ninmah and labor/creation material',
        adaptation: 'composite-adaptation',
        sourceIds: ['etcsl-1.1.2', 'ancient-atramhasis-igigi-labor'],
        claimsHistoricalBasis: true,
      },
      {
        id: 'ch3-grain',
        title: 'How grain came to Sumer',
        adaptation: 'close-paraphrase',
        sourceIds: ['etcsl-1.7.6'],
        claimsHistoricalBasis: true,
      },
      {
        id: 'ch3-underworld',
        title: 'Ereshkigal and Inana death/rebirth material',
        adaptation: 'close-paraphrase',
        sourceIds: ['etcsl-1.4.1'],
        claimsHistoricalBasis: true,
      },
      {
        id: 'ch3-adapa',
        title: 'Adapa pilgrimage/tradition',
        adaptation: 'composite-adaptation',
        sourceIds: ['ancient-adapa-tradition'],
        claimsHistoricalBasis: true,
      },
      {
        id: 'ch3-living-cities',
        title: 'Cities as living inheritance and Ninhursag first-person framing',
        adaptation: 'fictional-bridge',
        sourceIds: [],
        claimsHistoricalBasis: false,
      },
    ],
  },
] as const;

export function getEtcslComposition(
  compositionId: string,
): EtcslComposition | undefined {
  return ETCSL_COMPOSITIONS.find(
    (composition) => composition.compositionId === compositionId,
  );
}

export function getHistoricalSource(
  sourceId: string,
): HistoricalSourceBinding | undefined {
  return HISTORICAL_SOURCE_REGISTRY.find((source) => source.id === sourceId);
}

export function getChapterSourceMap(
  chapterId: string,
): ChapterSourceMap | undefined {
  return CHAPTER_SOURCE_MAPS.find((chapter) => chapter.id === chapterId);
}

function result(issues: ValidationIssue[]): ValidationResult {
  return {
    valid: !issues.some((issue) => issue.severity === 'error'),
    issues,
  };
}

export function validateHistoricalSourceBinding(
  source: HistoricalSourceBinding,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!source.id.trim()) {
    issues.push({
      severity: 'error',
      code: 'source.id.required',
      message: 'Historical source id is required.',
    });
  }

  if (!source.title.trim()) {
    issues.push({
      severity: 'error',
      code: 'source.title.required',
      message: 'Historical source title is required.',
    });
  }

  if (source.lineStart !== undefined || source.lineEnd !== undefined) {
    if (source.lineStart === undefined || source.lineEnd === undefined) {
      issues.push({
        severity: 'error',
        code: 'source.lines.pair',
        message: 'lineStart and lineEnd must be supplied together.',
      });
    } else if (source.lineStart < 1 || source.lineEnd < source.lineStart) {
      issues.push({
        severity: 'error',
        code: 'source.lines.range',
        message: 'Historical source line range is invalid.',
      });
    }
  }

  if (source.sourceType === 'etcsl') {
    if (!source.compositionId) {
      issues.push({
        severity: 'error',
        code: 'etcsl.composition.required',
        message: 'ETCSL sources require a compositionId.',
      });
    } else {
      const composition = getEtcslComposition(source.compositionId);
      if (!composition) {
        issues.push({
          severity: 'error',
          code: 'etcsl.composition.unknown',
          message: `Unknown ETCSL composition ${source.compositionId}.`,
        });
      } else if (source.url !== composition.translationUrl) {
        issues.push({
          severity: 'error',
          code: 'etcsl.url.mismatch',
          message: `ETCSL source URL must match the registered translation URL for ${source.compositionId}.`,
        });
      }
    }
  } else if (source.compositionId) {
    issues.push({
      severity: 'error',
      code: 'source.composition.non-etcsl',
      message: 'Only ETCSL source records may use the ETCSL compositionId field.',
    });
  }

  if (source.researchStatus === 'verified' && !source.url) {
    issues.push({
      severity: 'error',
      code: 'source.verified.url-required',
      message: 'Verified historical sources require a URL.',
    });
  }

  if (source.researchStatus === 'needs-research') {
    issues.push({
      severity: 'warning',
      code: 'source.research.pending',
      message: `${source.title} still needs exact bibliographic/source research.`,
    });
  }

  return result(issues);
}

export function validateVisualEvidenceBinding(
  evidence: VisualEvidenceBinding,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!evidence.id.trim()) {
    issues.push({
      severity: 'error',
      code: 'visual.id.required',
      message: 'Visual evidence id is required.',
    });
  }

  if (!evidence.institution.trim() || !evidence.title.trim()) {
    issues.push({
      severity: 'error',
      code: 'visual.identity.required',
      message: 'Visual evidence requires institution and title.',
    });
  }

  if (!/^https?:\/\//.test(evidence.url)) {
    issues.push({
      severity: 'error',
      code: 'visual.url.invalid',
      message: 'Visual evidence requires an http(s) URL.',
    });
  }

  if (!evidence.dateRange) {
    issues.push({
      severity: 'warning',
      code: 'visual.date.missing',
      message: 'Visual evidence has no date range; historical fit cannot yet be assessed.',
    });
  }

  return result(issues);
}

export function validateNarrativeThreadBinding(
  thread: NarrativeThreadBinding,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!thread.id.trim() || !thread.title.trim()) {
    issues.push({
      severity: 'error',
      code: 'thread.identity.required',
      message: 'Narrative thread requires id and title.',
    });
  }

  if (thread.claimsHistoricalBasis && thread.sourceIds.length === 0) {
    issues.push({
      severity: 'error',
      code: 'thread.source.required',
      message: 'A thread claiming historical/ancient-source basis requires at least one source id.',
    });
  }

  for (const sourceId of thread.sourceIds) {
    if (!getHistoricalSource(sourceId)) {
      issues.push({
        severity: 'error',
        code: 'thread.source.unknown',
        message: `Narrative thread references unknown source ${sourceId}.`,
      });
    }
  }

  if (
    thread.adaptation === 'fictional-bridge' &&
    thread.claimsHistoricalBasis &&
    thread.sourceIds.length === 0
  ) {
    issues.push({
      severity: 'error',
      code: 'thread.fictional-bridge.unsourced-claim',
      message: 'A fictional bridge cannot claim historical basis without explicit sources.',
    });
  }

  return result(issues);
}

export function validateChapterSourceMap(
  chapter: ChapterSourceMap,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();

  if (!chapter.manuscriptFile.trim() || !chapter.manuscriptRevision.trim()) {
    issues.push({
      severity: 'error',
      code: 'chapter.manuscript.required',
      message: 'Chapter source map requires manuscript file and revision.',
    });
  }

  for (const thread of chapter.threads) {
    if (ids.has(thread.id)) {
      issues.push({
        severity: 'error',
        code: 'chapter.thread.duplicate',
        message: `Duplicate narrative thread id ${thread.id}.`,
      });
    }
    ids.add(thread.id);
    issues.push(...validateNarrativeThreadBinding(thread).issues);
  }

  return result(issues);
}

export function validateHistoricalSourceRegistry(): ValidationResult {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();

  for (const source of HISTORICAL_SOURCE_REGISTRY) {
    if (ids.has(source.id)) {
      issues.push({
        severity: 'error',
        code: 'registry.source.duplicate',
        message: `Duplicate historical source id ${source.id}.`,
      });
    }
    ids.add(source.id);
    issues.push(...validateHistoricalSourceBinding(source).issues);
  }

  for (const chapter of CHAPTER_SOURCE_MAPS) {
    issues.push(...validateChapterSourceMap(chapter).issues);
  }

  return result(issues);
}
