import { createHash } from 'node:crypto';

export type CanonicalPrimitive = string | number | boolean | null;
export type CanonicalValue =
  | CanonicalPrimitive
  | readonly CanonicalValue[]
  | { readonly [key: string]: CanonicalValue };

export interface CanonicalizeOptions {
  readonly setLikeArrayPaths?: ReadonlySet<string>;
}

const WINDOWS_DRIVE_PATTERN = /^[A-Za-z]:[\\/]/;

export function normalizeLogicalPath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new TypeError('logicalPath is required.');
  if (WINDOWS_DRIVE_PATTERN.test(trimmed) || trimmed.startsWith('/')) {
    throw new RangeError(`Absolute logical path is forbidden: ${value}`);
  }

  const segments = trimmed.replace(/\\/g, '/').split('/');
  const normalized: string[] = [];
  for (const segment of segments) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      throw new RangeError(`Parent traversal is forbidden in logical path: ${value}`);
    }
    normalized.push(segment);
  }
  if (normalized.length === 0) throw new RangeError('logicalPath resolves to an empty path.');
  return normalized.join('/');
}

function canonicalPath(parent: string, key: string | number): string {
  const escaped = String(key).replace(/~/g, '~0').replace(/\//g, '~1');
  return `${parent}/${escaped}`;
}

function sortCanonicalArray(values: readonly CanonicalValue[]): readonly CanonicalValue[] {
  return [...values].sort((left, right) => {
    const a = JSON.stringify(left);
    const b = JSON.stringify(right);
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

export function canonicalize(
  value: unknown,
  options: CanonicalizeOptions = {},
  path = '',
): CanonicalValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Non-finite number is forbidden at ${path || '/'}.`);
    }
    return Object.is(value, -0) ? 0 : value;
  }

  if (value === undefined) {
    throw new TypeError(`undefined is forbidden in canonical data at ${path || '/'}.`);
  }

  if (Array.isArray(value)) {
    const normalized = value.map((entry, index) =>
      canonicalize(entry, options, canonicalPath(path, index)),
    );
    return options.setLikeArrayPaths?.has(path)
      ? sortCanonicalArray(normalized)
      : normalized;
  }

  if (typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const output: Record<string, CanonicalValue> = {};
    for (const key of Object.keys(input).sort()) {
      output[key] = canonicalize(input[key], options, canonicalPath(path, key));
    }
    return output;
  }

  throw new TypeError(`Unsupported canonical value ${typeof value} at ${path || '/'}.`);
}

export function canonicalJson(
  value: unknown,
  options: CanonicalizeOptions = {},
): string {
  return JSON.stringify(canonicalize(value, options));
}

export function sha256Canonical(
  value: unknown,
  options: CanonicalizeOptions = {},
): string {
  const bytes = Buffer.from(canonicalJson(value, options), 'utf8');
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

export function diffCanonicalPaths(left: unknown, right: unknown): readonly string[] {
  const a = canonicalize(left);
  const b = canonicalize(right);
  const differences: string[] = [];

  function walk(l: CanonicalValue | undefined, r: CanonicalValue | undefined, path: string): void {
    if (JSON.stringify(l) === JSON.stringify(r)) return;

    const lObject = l !== null && typeof l === 'object' && !Array.isArray(l);
    const rObject = r !== null && typeof r === 'object' && !Array.isArray(r);
    if (lObject && rObject) {
      const keys = new Set([
        ...Object.keys(l as Record<string, CanonicalValue>),
        ...Object.keys(r as Record<string, CanonicalValue>),
      ]);
      for (const key of [...keys].sort()) {
        walk(
          (l as Record<string, CanonicalValue>)[key],
          (r as Record<string, CanonicalValue>)[key],
          canonicalPath(path, key),
        );
      }
      return;
    }

    const lArray = Array.isArray(l);
    const rArray = Array.isArray(r);
    if (lArray && rArray) {
      const length = Math.max(l.length, r.length);
      for (let index = 0; index < length; index += 1) {
        walk(l[index], r[index], canonicalPath(path, index));
      }
      return;
    }

    differences.push(path || '/');
  }

  walk(a, b, '');
  return differences;
}
