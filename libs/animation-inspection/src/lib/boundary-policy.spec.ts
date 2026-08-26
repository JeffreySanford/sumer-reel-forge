import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const productionSources = readdirSync(sourceDirectory)
  .filter((name) => name.endsWith('.ts') && !name.endsWith('.spec.ts') && !name.endsWith('.test.ts'))
  .map((name) => ({
    name,
    content: readFileSync(join(sourceDirectory, name), 'utf8'),
  }));

describe('animation inspection boundary policy', () => {
  it('stays independent from UI frameworks, visual engines, browser clocks and global randomness', () => {
    const forbiddenImports = [
      'react',
      '@angular/',
      'remotion',
      '@remotion/',
      'pixi',
      '@pixi/',
      'three',
      '@react-three/',
      '@dimforge/',
      'rive',
      '@rive-app/',
    ];
    const forbiddenState = [
      'Math.random(',
      'Date.now(',
      'performance.now(',
      'requestAnimationFrame(',
      'window.',
      'document.',
    ];

    for (const source of productionSources) {
      for (const token of forbiddenImports) {
        expect(source.content, `${source.name} imports or references ${token}`).not.toContain(token);
      }
      for (const token of forbiddenState) {
        expect(source.content, `${source.name} uses forbidden state ${token}`).not.toContain(token);
      }
    }
  });
});
