import {
  getPhase1ProvenanceHealth,
  validatePhase1ProvenanceRegistry,
  validateSupplementalHistoricalSourceRegistry,
} from './provenance-registry';
import { HISTORICAL_SOURCE_REGISTRY } from './historical-sources';

describe('Phase 1C provenance registry trust boundary', () => {
  it('accepts the complete Phase 1 provenance registry with only known research warnings', () => {
    const validation = validatePhase1ProvenanceRegistry();

    expect(validation.valid).toBe(true);
    expect(validation.issues.filter((issue) => issue.severity === 'error')).toEqual([]);
    expect(
      validation.issues
        .filter((issue) => issue.severity === 'warning')
        .map((issue) => issue.code),
    ).toEqual(['source.research.pending', 'source.research.pending']);
  });

  it('produces deterministic health without timestamps or presentation markup', () => {
    expect(getPhase1ProvenanceHealth()).toEqual({
      valid: true,
      errorCount: 0,
      warningCount: 2,
      errorCodes: [],
      warningCodes: ['source.research.pending', 'source.research.pending'],
    });

    expect(JSON.stringify(getPhase1ProvenanceHealth())).not.toMatch(
      /<\/?[a-z][^>]*>/i,
    );
  });

  it('rejects a supplemental source id that collides with the base registry', () => {
    const existing = HISTORICAL_SOURCE_REGISTRY[0];
    const validation = validateSupplementalHistoricalSourceRegistry([
      {
        ...existing,
        title: 'Intentional collision fixture',
      },
    ]);

    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain(
      'registry.supplemental-source.collides-with-base',
    );
  });

  it('rejects duplicate ids inside the supplemental collection', () => {
    const fixture = {
      id: 'fixture:duplicate-source:v1',
      sourceType: 'modern-scholarship' as const,
      title: 'Duplicate source fixture',
      url: 'https://example.org/source',
      adaptation: 'direct-source' as const,
      confidence: 'high' as const,
      researchStatus: 'verified' as const,
    };

    const validation = validateSupplementalHistoricalSourceRegistry([
      fixture,
      { ...fixture },
    ]);

    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain(
      'registry.supplemental-source.duplicate',
    );
  });
});
