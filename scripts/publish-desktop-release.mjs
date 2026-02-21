import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const tag = `v${version}`;
const repo = 'rickkwang/Gitick';
const releaseDir = join(root, 'release');

const ARCHS = ['arm64', 'x64'];

const expectedAssetNames = ARCHS.flatMap((arch) => [
  `Gitick-${version}-${arch}.dmg`,
  `Gitick-${version}-${arch}.dmg.blockmap`,
  `Gitick-${version}-${arch}.zip`,
  `Gitick-${version}-${arch}.zip.blockmap`,
]);
expectedAssetNames.push('latest-mac.yml');

const requiredPaths = expectedAssetNames.map((name) => join(releaseDir, name));
for (const file of requiredPaths) {
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

const uploadPaths = expectedAssetNames.map((name) => join(releaseDir, name));

const view = spawnSync('gh', ['release', 'view', tag, '--repo', repo], { stdio: 'pipe', encoding: 'utf8' });
const releaseExists = view.status === 0;

if (!releaseExists) {
  run('gh', [
    'release',
    'create',
    tag,
    ...uploadPaths,
    '--repo',
    repo,
    '--title',
    `Gitick ${tag}`,
    '--notes',
    `Desktop release ${tag} with in-app updater artifacts for arm64 and x64.`,
  ]);
} else {
  run('gh', [
    'release',
    'upload',
    tag,
    ...uploadPaths,
    '--repo',
    repo,
    '--clobber',
  ]);
}

const verify = spawnSync('gh', ['release', 'view', tag, '--repo', repo, '--json', 'assets'], {
  stdio: 'pipe',
  encoding: 'utf8',
});

if (verify.status !== 0) {
  console.error(`Failed to verify uploaded assets for ${tag}.`);
  process.stderr.write(verify.stderr || '');
  process.exit(verify.status ?? 1);
}

const verifyJson = JSON.parse(verify.stdout || '{}');
const uploadedNames = new Set((verifyJson.assets || []).map((asset) => asset.name));
const missing = expectedAssetNames.filter((name) => !uploadedNames.has(name));

if (missing.length > 0) {
  console.error(`Release ${tag} is missing assets: ${missing.join(', ')}`);
  process.exit(1);
}

const releaseFiles = readdirSync(releaseDir)
  .filter((name) => expectedAssetNames.includes(name))
  .sort();

console.log(`Published ${tag} with updater artifacts: ${releaseFiles.join(', ')}`);
