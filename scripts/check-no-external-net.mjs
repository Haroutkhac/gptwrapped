#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const roots = [
  'apps/web/app',
  'apps/web/components',
  'apps/web/lib'
];
const textExts = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const disallowedPatterns = [/(https?:\/\/(?!localhost)[a-z0-9.-]+)/i];
const analyticsKeywords = ['sentry', 'mixpanel', 'amplitude', 'segment', 'posthog', 'google-analytics', 'ga4'];

const violations = [];

async function walk(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      if (entry.name === 'node_modules') continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (textExts.has(extname(entry.name))) {
        const content = await readFile(full, 'utf8');
        if (disallowedPatterns.some((regex) => regex.test(content))) {
          violations.push(`${full}: external URL detected`);
        }
        const lowered = content.toLowerCase();
        if (analyticsKeywords.some((kw) => lowered.includes(kw))) {
          violations.push(`${full}: analytics keyword detected`);
        }
      }
    }
  } catch (err) {
    if (err.code === 'ENOENT') return;
    throw err;
  }
}

for (const root of roots) {
  await walk(root);
}

if (violations.length) {
  console.error('Safety check failed:\n' + violations.join('\n'));
  process.exit(1);
} else {
  console.log('Safety check passed: no external URLs or analytics SDKs detected.');
}
