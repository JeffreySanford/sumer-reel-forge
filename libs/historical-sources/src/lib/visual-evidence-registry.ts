import type { CanonicalVisualEvidenceBinding } from './visual-evidence-types';

export const VISUAL_EVIDENCE_REGISTRY: readonly CanonicalVisualEvidenceBinding[] = [
  {
    id: 'visual:bm:standard-of-ur:1928-1010-3:v1',
    revision: 'v1',
    evidenceType: 'museum-object',
    institution: 'British Museum',
    objectNumber: '1928,1010.3',
    title: 'The Standard of Ur',
    culture: 'Sumerian',
    dateRange: '2550-2400 BCE',
    findspot: 'Royal Cemetery at Ur',
    material: 'shell, red limestone, lapis lazuli, bitumen',
    url: 'https://www.britishmuseum.org/collection/object/W_1928-1010-3',
    rightsStatus: 'metadata-only',
    confidence: 'high',
    notes:
      'Canonical object identity. Project uses are stored separately as VisualEvidenceApplication records; image bytes are not assumed licensed for ingest.',
  },
  {
    id: 'visual:bm:royal-game-ur:1928-1009-378:v1',
    revision: 'v1',
    evidenceType: 'museum-object',
    institution: 'British Museum',
    objectNumber: '1928,1009.378',
    title: 'The Royal Game of Ur',
    culture: 'Sumerian',
    dateRange: '2600-2400 BCE',
    findspot: 'Royal Cemetery at Ur',
    material: 'wood, shell and inlay',
    url: 'https://www.britishmuseum.org/collection/object/W_1928-1009-378',
    rightsStatus: 'metadata-only',
    confidence: 'high',
    notes:
      'Canonical object identity for material and decorative-context research; image use remains metadata/reference-only unless separately licensed.',
  },
  {
    id: 'visual:met:banquet-seal:56-157-1:v1',
    revision: 'v1',
    evidenceType: 'museum-object',
    institution: 'The Metropolitan Museum of Art',
    objectNumber: '56.157.1',
    title: 'Cylinder seal with banquet scene',
    culture: 'Sumerian',
    dateRange: 'ca. 2600-2350 BCE',
    material: 'gypsum alabaster',
    url: 'https://www.metmuseum.org/art/collection/search/324572',
    imageLicense: 'Public Domain',
    rightsStatus: 'public-domain',
    confidence: 'high',
    notes:
      'Canonical object identity. Public-domain status is recorded independently from historical confidence and project inference.',
  },
] as const;

export function getVisualEvidence(
  evidenceId: string,
): CanonicalVisualEvidenceBinding | undefined {
  return VISUAL_EVIDENCE_REGISTRY.find((evidence) => evidence.id === evidenceId);
}
