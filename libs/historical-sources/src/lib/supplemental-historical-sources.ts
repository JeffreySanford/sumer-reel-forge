import {
  HISTORICAL_SOURCE_REGISTRY,
  getHistoricalSource,
  type HistoricalSourceBinding,
} from './historical-sources';

export const SUPPLEMENTAL_HISTORICAL_SOURCE_REGISTRY: readonly HistoricalSourceBinding[] = [
  {
    id: 'scholarship:penn:legrain-al-ubaid-1944:v1',
    sourceType: 'modern-scholarship',
    title: "al-'Ubaid",
    authorOrInstitution: 'Penn Museum / Leon Legrain',
    url: 'https://www.penn.museum/sites/bulletin/2583/',
    adaptation: 'composite-adaptation',
    confidence: 'high',
    researchStatus: 'verified',
    notes:
      'Modern archaeological publication used as contextual evidence. It is not a museum-object identity and must never be promoted as one.',
  },
  {
    id: 'reference:oracc:an:v1',
    sourceType: 'modern-scholarship',
    title: 'Ancient Mesopotamian Gods and Goddesses — An/Anu',
    authorOrInstitution: 'ORACC / University of Pennsylvania',
    url: 'https://oracc.museum.upenn.edu/amgg/Listofdeities/An/index.html',
    adaptation: 'direct-source',
    confidence: 'high',
    researchStatus: 'verified',
    notes: 'Institutional reference for An cult, temples and offerings.',
  },
  {
    id: 'reference:oracc:zababa:v1',
    sourceType: 'modern-scholarship',
    title: 'Ancient Mesopotamian Gods and Goddesses — Zababa',
    authorOrInstitution: 'ORACC / University of Pennsylvania',
    url: 'https://oracc.museum.upenn.edu/amgg/Listofdeities/Zababa/index.html',
    adaptation: 'direct-source',
    confidence: 'high',
    researchStatus: 'verified',
    notes: 'Institutional reference for Zababa and Kish.',
  },
  {
    id: 'reference:oracc:ninlil:v1',
    sourceType: 'modern-scholarship',
    title: 'Ancient Mesopotamian Gods and Goddesses — Ninlil',
    authorOrInstitution: 'ORACC / University of Pennsylvania',
    url: 'https://oracc.museum.upenn.edu/amgg/listofdeities/ninlil/',
    adaptation: 'direct-source',
    confidence: 'high',
    researchStatus: 'verified',
    notes: 'Institutional reference for Sud/Ninlil and Shuruppak traditions.',
  },
  {
    id: 'reference:oracc:nergal:v1',
    sourceType: 'modern-scholarship',
    title: 'Ancient Mesopotamian Gods and Goddesses — Nergal',
    authorOrInstitution: 'ORACC / University of Pennsylvania',
    url: 'https://oracc.museum.upenn.edu/amgg/Listofdeities/Nergal/',
    adaptation: 'direct-source',
    confidence: 'high',
    researchStatus: 'verified',
    notes: 'Institutional reference for Nergal, Kutha, warfare, death and plague.',
  },
  {
    id: 'reference:oracc:inanna-ishtar:v1',
    sourceType: 'modern-scholarship',
    title: 'Ancient Mesopotamian Gods and Goddesses — Inanna/Ishtar',
    authorOrInstitution: 'ORACC / University of Pennsylvania',
    url: 'https://oracc.museum.upenn.edu/amgg/listofdeities/inanaitar/',
    adaptation: 'direct-source',
    confidence: 'high',
    researchStatus: 'verified',
    notes:
      'Institutional reference for Inanna/Ishtar identity, Uruk, Venus and historical syncretism.',
  },
] as const;

export const ALL_HISTORICAL_SOURCES: readonly HistoricalSourceBinding[] = [
  ...HISTORICAL_SOURCE_REGISTRY,
  ...SUPPLEMENTAL_HISTORICAL_SOURCE_REGISTRY,
] as const;

export function getSupplementalHistoricalSource(
  sourceId: string,
): HistoricalSourceBinding | undefined {
  return SUPPLEMENTAL_HISTORICAL_SOURCE_REGISTRY.find(
    (source) => source.id === sourceId,
  );
}

export function getKnownHistoricalSource(
  sourceId: string,
): HistoricalSourceBinding | undefined {
  return getHistoricalSource(sourceId) ?? getSupplementalHistoricalSource(sourceId);
}
