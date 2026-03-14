import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const releaseDir = join(root, 'release');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = pkg.version;

if (!existsSync(releaseDir)) {
  console.error('release directory does not exist. Run desktop build first.');
  process.exit(1);
}

const files = readdirSync(releaseDir);
const latestMacYml = join(releaseDir, 'latest-mac.yml');
if (!existsSync(latestMacYml)) {
  console.error('Missing updater metadata: release/latest-mac.yml');
  process.exit(1);
}

const zipPrefix = `Gitick-${version}-`;
const zipFiles = files.filter((name) => name.startsWith(zipPrefix) && name.endsWith('.zip'));
if (zipFiles.length === 0) {
  console.error(`Missing updater zip artifacts for version ${version}.`);
  process.exit(1);
}

const missingBlockmaps = zipFiles
  .map((zip) => `${zip}.blockmap`)
  .filter((blockmap) => !files.includes(blockmap));

if (missingBlockmaps.length > 0) {
  console.error(`Missing blockmap(s): ${missingBlockmaps.join(', ')}`);
  process.exit(1);
}

console.log(`Updater artifact check passed (${zipFiles.length} zip + blockmap pair(s), latest-mac.yml present).`);
