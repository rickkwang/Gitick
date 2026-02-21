import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const tag = `v${version}`;
const repo = 'rickkwang/Gitick';

const dmgName = `Gitick-${version}-arm64.dmg`;
const blockmapName = `Gitick-${version}-arm64.dmg.blockmap`;
const zipName = `Gitick-${version}-arm64.zip`;
const zipBlockmapName = `Gitick-${version}-arm64.zip.blockmap`;
const latestName = 'latest-mac.yml';

const dmgPath = join(root, 'release', dmgName);
const blockmapPath = join(root, 'release', blockmapName);
const zipPath = join(root, 'release', zipName);
const zipBlockmapPath = join(root, 'release', zipBlockmapName);
const latestPath = join(root, 'release', latestName);

const required = [dmgPath, blockmapPath, zipPath, zipBlockmapPath, latestPath];
for (const file of required) {
  if (!existsSync(file)) {
    console.error(`Missing required release artifact: ${file}`);
    process.exit(1);
  }
}

const run = (cmd, args) => {
  const res = spawnSync(cmd, args, { stdio: 'inherit' });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
};

const view = spawnSync('gh', ['release', 'view', tag, '--repo', repo], { stdio: 'pipe', encoding: 'utf8' });
const releaseExists = view.status === 0;

if (!releaseExists) {
  run('gh', [
    'release',
    'create',
    tag,
    dmgPath,
    blockmapPath,
    zipPath,
    zipBlockmapPath,
    latestPath,
    '--repo',
    repo,
    '--title',
    `Gitick ${tag}`,
    '--notes',
    `Desktop release ${tag} with in-app updater artifacts.`,
  ]);
} else {
  run('gh', [
    'release',
    'upload',
    tag,
    dmgPath,
    blockmapPath,
    zipPath,
    zipBlockmapPath,
    latestPath,
    '--repo',
    repo,
    '--clobber',
  ]);
}

console.log(`Published ${tag} with DMG, blockmap, and latest-mac.yml`);
