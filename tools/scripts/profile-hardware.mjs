import 'dotenv/config';
import { resolve } from 'node:path';
import {
  collectAndPersistHardwareProfile,
  formatHardwareProfile,
} from '../runtime/hardware-profile.mjs';

async function main() {
  const root = resolve('.');
  const { profile, outputPath } = await collectAndPersistHardwareProfile({
    root,
    env: process.env,
  });
  console.log(formatHardwareProfile(profile, outputPath));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
