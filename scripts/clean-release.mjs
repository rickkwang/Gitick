import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const releaseDir = join(root, 'release');

if (!existsSync(releaseDir)) {
  console.log('release/ does not exist, nothing to clean');
  process.exit(0);
}

const files = readdirSync(releaseDir);
if (files.length === 0) {
  console.log('release/ is already empty');
  process.exit(0);
}

files.forEach((file) => {
  const fullPath = join(releaseDir, file);
  rmSync(fullPath, { recursive: true, force: true });
  console.log(`Removed: ${file}`);
});

console.log(`Cleaned ${files.length} item(s) from release/`);
