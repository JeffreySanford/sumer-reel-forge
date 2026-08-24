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

const requiredToolingPackages = ['@eslint/js'];
const missingToolingPackages = requiredToolingPackages.filter(
  (toolingPackage) => !declared.has(toolingPackage),
);

if (missingToolingPackages.length > 0) {
  console.error('Workspace tooling dependency consistency check failed.');
  console.error(
    'Root tooling packages required by the Nx/ESLint project graph are missing from package.json:',
  );
  for (const toolingPackage of missingToolingPackages) {
    console.error(`  - ${toolingPackage}`);
  }
  console.error('Declare each required tooling package explicitly before running Nx.');
  process.exit(1);
}

const startupEntrypoints = [
  'tools/scripts/start-local.mjs',
  'tools/scripts/start-all.mjs',
  'tools/scripts/renderer-worker.mjs',
];
const invalidStartupImports = [];
for (const path of startupEntrypoints) {
  const source = await readFile(resolve(root, path), 'utf8');
  if (/['"]dotenv\/config['"]/.test(source)) {
    invalidStartupImports.push(path);
  }
}

if (invalidStartupImports.length > 0) {
  console.error('Workspace startup bootstrap consistency check failed.');
  console.error(
    'Managed runtime entrypoints must use Node native .env loading so they remain independent of undeclared bootstrap packages:',
  );
  for (const path of invalidStartupImports) {
    console.error(`  - ${path}`);
  }
  process.exit(1);
}

console.log(
  `Workspace dependency consistency OK: ${configuredPlugins.length} Nx plugins resolve to explicitly declared packages.`,
);
console.log(
  `Workspace tooling dependency consistency OK: ${requiredToolingPackages.length} root tooling package is explicitly declared.`,
);
console.log(
  `Workspace startup bootstrap consistency OK: ${startupEntrypoints.length} managed entrypoints are dependency-free for .env loading.`,
);

function packageRootFromSpecifier(specifier) {
  const parts = specifier.split('/');
  if (specifier.startsWith('@')) {
    return parts.slice(0, 2).join('/');
  }
  return parts[0];
}
