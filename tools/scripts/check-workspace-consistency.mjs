import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(
  await readFile(resolve(root, 'package.json'), 'utf8'),
);
const nxJson = JSON.parse(await readFile(resolve(root, 'nx.json'), 'utf8'));

const declared = new Set([
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.devDependencies ?? {}),
  ...Object.keys(packageJson.optionalDependencies ?? {}),
]);

const configuredPlugins = (nxJson.plugins ?? [])
  .map((entry) => (typeof entry === 'string' ? entry : entry?.plugin))
  .filter((entry) => typeof entry === 'string' && entry.length > 0);

const configuredPackages = configuredPlugins.map(packageRootFromSpecifier);
const missingPackages = [...new Set(configuredPackages)].filter(
  (pluginPackage) => !declared.has(pluginPackage),
);

if (missingPackages.length > 0) {
  console.error('Workspace dependency consistency check failed.');
  console.error('Nx plugin packages configured in nx.json but missing from package.json:');
  for (const pluginPackage of missingPackages) {
    console.error(`  - ${pluginPackage}`);
  }
  console.error('Declare each configured Nx plugin package explicitly before running Nx.');
  process.exit(1);
}

console.log(
  `Workspace dependency consistency OK: ${configuredPlugins.length} Nx plugins resolve to explicitly declared packages.`,
);

function packageRootFromSpecifier(specifier) {
  const parts = specifier.split('/');
  if (specifier.startsWith('@')) {
    return parts.slice(0, 2).join('/');
  }
  return parts[0];
}
