#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const sepIndex = args.indexOf('--');
const metaArgs = sepIndex >= 0 ? args.slice(0, sepIndex) : args;
const cmdParts = sepIndex >= 0 ? args.slice(sepIndex + 1) : [];

const getArgValue = (flag, fallback) => {
  const idx = metaArgs.indexOf(flag);
  if (idx === -1) return fallback;
  const value = metaArgs[idx + 1];
  return value ?? fallback;
};

const label = String(getArgValue('--label', 'command'));
const retries = Math.max(0, Number.parseInt(String(getArgValue('--retries', '1')), 10) || 1);
const timeoutMs = Math.max(10_000, Number.parseInt(String(getArgValue('--timeout', '180000')), 10) || 180000);
const cleanupCommand = getArgValue('--cleanup', '');

if (cmdParts.length === 0) {
  console.error('No command provided. Usage: node scripts/run-command-stable.mjs --label build --timeout 180000 --retries 1 -- "vite build"');
  process.exit(1);
}

const command = cmdParts.join(' ');
let attempt = 0;

while (attempt <= retries) {
  attempt += 1;
  console.log(`[stable-run] ${label}: attempt ${attempt}/${retries + 1}`);

  const result = spawnSync(command, {
    shell: true,
    stdio: 'inherit',
    timeout: timeoutMs,
    env: process.env,
  });

  const didTimeout = Boolean(result.error && result.error.code === 'ETIMEDOUT');
  if (result.status === 0 && !didTimeout) {
    process.exit(0);
  }

  if (didTimeout) {
    console.warn(`[stable-run] ${label}: timed out after ${timeoutMs}ms`);
  } else {
    console.warn(`[stable-run] ${label}: failed with exit code ${result.status ?? 'unknown'}`);
  }

  if (attempt > retries) {
    process.exit(result.status ?? 1);
  }

  if (cleanupCommand) {
    console.log(`[stable-run] ${label}: running cleanup before retry`);
    spawnSync(cleanupCommand, { shell: true, stdio: 'inherit', env: process.env });
  }
}

