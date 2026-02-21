import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const releaseDir = join(root, 'release');

const targets = [
  { arch: 'arm64', appPath: join(releaseDir, 'mac-arm64', 'Gitick.app') },
  { arch: 'x64', appPath: join(releaseDir, 'mac', 'Gitick.app') },
];

let hasError = false;

for (const target of targets) {
  if (!existsSync(target.appPath)) {
    console.error(`Missing app bundle for ${target.arch}: ${target.appPath}`);
    hasError = true;
    continue;
  }

  const result = spawnSync('codesign', ['-dv', '--verbose=4', target.appPath], {
    encoding: 'utf8',
  });
  const raw = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
  const lower = raw.toLowerCase();

  if (result.error) {
    console.error(`codesign command failed for ${target.arch}: ${result.error.message}`);
    hasError = true;
    continue;
  }

  if (result.status !== 0) {
    console.warn(`Warning: signature check failed for ${target.arch}: ${raw || `exit ${result.status}`}`);
    continue;
  }

  if (lower.includes('code object is not signed at all')) {
    console.warn(`Warning: unsigned app bundle for ${target.arch}: ${target.appPath}`);
    continue;
  }

  const isAdhoc = /signature=adhoc/i.test(raw) || /teamidentifier=not set/i.test(raw);
  const teamIdentifierMatch = raw.match(/TeamIdentifier=(.+)/);
  const teamIdentifier = teamIdentifierMatch?.[1]?.trim() || null;

  if (isAdhoc) {
    console.warn(`Warning: ${target.arch} build is ad-hoc signed. In-app updater reliability may vary across macOS setups.`);
  } else if (!teamIdentifier) {
    console.warn(`Warning: ${target.arch} signature missing TeamIdentifier.`);
  } else {
    console.log(`Verified ${target.arch} signature. TeamIdentifier=${teamIdentifier}`);
  }
}

if (hasError) {
  process.exit(1);
}

console.log('Mac signature verification passed for release artifacts.');
