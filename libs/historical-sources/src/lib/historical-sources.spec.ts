import {
  CHAPTER_SOURCE_MAPS,
  ETCSL_COMPOSITIONS,
  HISTORICAL_SOURCE_REGISTRY,
  getEtcslComposition,
  validateChapterSourceMap,
  validateHistoricalSourceBinding,
  validateHistoricalSourceRegistry,
  validateNarrativeThreadBinding,
  validateVisualEvidenceBinding,
  type HistoricalSourceBinding,
  type NarrativeThreadBinding,
  type VisualEvidenceBinding,
} from './historical-sources';

describe('historical source registry', () => {
  it('registers the ETCSL compositions used by Chapters 1-3', () => {
    expect(ETCSL_COMPOSITIONS.map((item) => item.compositionId)).toEqual(
      expect.arrayContaining([
        '1.1.1',
        '1.1.2',
        '1.1.3',
        '1.1.4',
        '1.2.1',
        '1.2.2',
        '1.4.1',
        '1.7.6',
      ]),
    );
  });

  it('binds every ETCSL source to the registered Oxford translation URL', () => {
    const etcslSources = HISTORICAL_SOURCE_REGISTRY.filter(
      (source) => source.sourceType === 'etcsl',
    );

    expect(etcslSources.length).toBe(ETCSL_COMPOSITIONS.length);

    for (const source of etcslSources) {
      const composition = getEtcslComposition(source.compositionId ?? '');
      expect(composition).toBeDefined();
      expect(source.url).toBe(composition?.translationUrl);
      expect(validateHistoricalSourceBinding(source).valid).toBe(true);
    }
  });

  it('keeps Atrahasis and Adapa explicitly outside ETCSL', () => {
    const atrahasis = HISTORICAL_SOURCE_REGISTRY.find(
      (source) => source.id === 'ancient-atramhasis-igigi-labor',
    );
    const adapa = HISTORICAL_SOURCE_REGISTRY.find(
      (source) => source.id === 'ancient-adapa-tradition',
    );

    expect(atrahasis?.sourceType).toBe('ancient-text-other');
    expect(atrahasis?.compositionId).toBeUndefined();
    expect(adapa?.sourceType).toBe('ancient-text-other');
    expect(adapa?.compositionId).toBeUndefined();
  });

  it('allows fictional bridges without pretending they have an ancient source', () => {
    const thread: NarrativeThreadBinding = {
      id: 'fictional-test',
      title: 'Authored connective scene',
      adaptation: 'fictional-bridge',
      sourceIds: [],
      claimsHistoricalBasis: false,
    };

    expect(validateNarrativeThreadBinding(thread)).toEqual({
      valid: true,
      issues: [],
    });
  });

  it('rejects an unsourced thread that claims historical basis', () => {
    const thread: NarrativeThreadBinding = {
      id: 'bad-claim',
      title: 'Unsourced historical claim',
      adaptation: 'speculative-reconstruction',
      sourceIds: [],
      claimsHistoricalBasis: true,
    };

    const validation = validateNarrativeThreadBinding(thread);
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain(
      'thread.source.required',
    );
  });

  it('rejects invalid ETCSL line ranges and unknown compositions', () => {
    const source: HistoricalSourceBinding = {
      id: 'bad-etcsl',
      sourceType: 'etcsl',
      title: 'Bad ETCSL source',
      url: 'https://example.invalid',
      compositionId: '9.9.9',
      lineStart: 20,
      lineEnd: 10,
      adaptation: 'direct-source',
      confidence: 'high',
      researchStatus: 'verified',
    };

    const validation = validateHistoricalSourceBinding(source);
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'source.lines.range',
        'etcsl.composition.unknown',
      ]),
    );
  });

  it('keeps incomplete non-ETCSL research visible as warnings, not fake certainty', () => {
    const source = HISTORICAL_SOURCE_REGISTRY.find(
      (item) => item.id === 'ancient-atramhasis-igigi-labor',
    );
    expect(source).toBeDefined();

    const validation = validateHistoricalSourceBinding(source!);
    expect(validation.valid).toBe(true);
    expect(validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'warning',
          code: 'source.research.pending',
        }),
      ]),
    );
  });

  it('requires visual evidence to identify a real source URL and warns when dating is absent', () => {
    const evidence: VisualEvidenceBinding = {
      id: 'museum-fixture',
      institution: 'Example Museum',
      title: 'Example object',
      culture: 'Sumerian',
      url: 'https://example.org/object/1',
      usage: 'social-staging',
      confidence: 'analogical',
    };

    const validation = validateVisualEvidenceBinding(evidence);
    expect(validation.valid).toBe(true);
    expect(validation.issues.map((issue) => issue.code)).toContain(
      'visual.date.missing',
    );
  });

  it('maps all three manuscript chapters and keeps each chapter structurally valid', () => {
    expect(CHAPTER_SOURCE_MAPS.map((chapter) => chapter.id)).toEqual([
      'chapter-01-enki',
      'chapter-02-enlil',
      'chapter-03-cities',
    ]);

    for (const chapter of CHAPTER_SOURCE_MAPS) {
      expect(validateChapterSourceMap(chapter).valid).toBe(true);
    }
  });

  it('has no registry errors while preserving pending-research warnings', () => {
    const validation = validateHistoricalSourceRegistry();
    expect(validation.valid).toBe(true);
    expect(validation.issues.some((issue) => issue.severity === 'error')).toBe(
      false,
    );
    expect(validation.issues.some((issue) => issue.severity === 'warning')).toBe(
      true,
    );
  });
});
