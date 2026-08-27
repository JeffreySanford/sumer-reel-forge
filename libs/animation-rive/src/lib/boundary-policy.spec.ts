import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const productionSources = readdirSync(sourceDirectory)
  .filter(
    (name) =>
      name.endsWith('.ts') &&
      !name.endsWith('.spec.ts') &&
      !name.endsWith('.test.ts'),
  )
  .map((name) => ({
    name,
    content: readFileSync(join(sourceDirectory, name), 'utf8'),
  }));

describe('animation Rive adapter boundary policy', () => {
  it('does not move story authority into UI frameworks or autonomous clocks', () => {
    const forbiddenImports = [
      'react',
      '@angular/',
      'remotion',
      '@remotion/',
      'pixi',
      '@pixi/',
      'three',
      '@react-three/',
    ];
    const forbiddenState = [
      'Math.random(',
      'Date.now(',
      'performance.now(',
      'requestAnimationFrame(',
      'setInterval(',
      'setTimeout(',
      'autoplay: true',
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
