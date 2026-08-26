import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

function productionSourceRoot(): string {
  const workspacePath = resolve(process.cwd(), 'libs/animation-frame/src/lib');
  if (existsSync(workspacePath)) return workspacePath;
  return resolve(process.cwd(), 'src/lib');
}

describe('frame-kernel determinism policy', () => {
  it('contains no global randomness or wall-clock animation state', async () => {
    const root = productionSourceRoot();
    const files = (await readdir(root))
      .filter((file) => file.endsWith('.ts') && !file.endsWith('.spec.ts'))
      .sort();

    const forbidden = [
      { label: 'global randomness', pattern: /Math\.random\s*\(/ },
      { label: 'wall clock', pattern: /Date\.now\s*\(/ },
      { label: 'high-resolution wall clock', pattern: /performance\.now\s*\(/ },
      { label: 'ambient current date', pattern: /new\s+Date\s*\(/ },
    ];

    for (const file of files) {
      const source = await readFile(resolve(root, file), 'utf8');
      for (const rule of forbidden) {
        expect(source, `${file} uses forbidden ${rule.label}`).not.toMatch(
          rule.pattern,
        );
      }
    }
  });
});
