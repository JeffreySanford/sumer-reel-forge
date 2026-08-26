export interface SemanticSeedInput {
  readonly sceneSeed: number;
  readonly sceneId: string;
  readonly targetId: string;
  readonly channel: string;
  readonly purpose: string;
  readonly version?: 1;
}

function assertNonEmpty(label: string, value: string): void {
  if (!value.trim()) throw new TypeError(`${label} is required.`);
}

function encodeField(name: string, value: string): string {
  return `${name.length}:${name}${value.length}:${value}`;
}

export function canonicalSemanticSeedKey(input: SemanticSeedInput): string {
  if (!Number.isInteger(input.sceneSeed)) {
    throw new TypeError('sceneSeed must be an integer.');
  }
  assertNonEmpty('sceneId', input.sceneId);
  assertNonEmpty('targetId', input.targetId);
  assertNonEmpty('channel', input.channel);
  assertNonEmpty('purpose', input.purpose);

  const version = input.version ?? 1;
  if (version !== 1) throw new RangeError(`Unsupported semantic seed version ${version}.`);

  return [
    encodeField('version', String(version)),
    encodeField('sceneSeed', String(input.sceneSeed)),
    encodeField('sceneId', input.sceneId),
    encodeField('targetId', input.targetId),
    encodeField('channel', input.channel),
    encodeField('purpose', input.purpose),
  ].join('|');
}

function fnv1a32Utf16(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    hash ^= code & 0xff;
    hash = Math.imul(hash, 0x01000193);
    hash ^= code >>> 8;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function deriveSemanticSeed(input: SemanticSeedInput): number {
  return fnv1a32Utf16(canonicalSemanticSeedKey(input));
}
