#!/usr/bin/env node
/**
 * Pack package/ into a signed .cpmod.zip (CommaDesk Module Apps).
 *
 * Usage:
 *   node scripts/pack.mjs \
 *     --publisher-id pub-xxxx \
 *     --private-key ./keys/private.pem \
 *     --out ./dist/camera-notes.cpmod.zip
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const dir = path.resolve(arg('--dir', path.join(repoRoot, 'package')));
const out = path.resolve(arg('--out', path.join(repoRoot, 'dist', 'camera-notes.cpmod.zip')));
const publisherId = arg('--publisher-id', '');
const privateKeyPath = arg('--private-key', '');

if (!publisherId || !privateKeyPath) {
  console.error('Required: --publisher-id --private-key');
  console.error('Optional: --dir (default ./package) --out (default ./dist/camera-notes.cpmod.zip)');
  process.exit(1);
}

function walk(base, rel = '') {
  const abs = path.join(base, rel);
  const entries = fs.readdirSync(abs, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.name === 'SIGNATURE' || e.name === 'README.md' || e.name.startsWith('.')) continue;
    if (e.isDirectory()) files.push(...walk(base, r));
    else if (e.isFile()) files.push(r.replace(/\\/g, '/'));
  }
  return files;
}

if (!fs.existsSync(path.join(dir, 'module.json'))) {
  console.error('Missing module.json in', dir);
  process.exit(1);
}

const modulePath = path.join(dir, 'module.json');
const mod = JSON.parse(fs.readFileSync(modulePath, 'utf8'));
mod.publisher_id = publisherId;
fs.writeFileSync(modulePath, JSON.stringify(mod, null, 2) + '\n');

const files = walk(dir).sort();
const hash = crypto.createHash('sha256');
for (const rel of files) {
  const buf = fs.readFileSync(path.join(dir, rel));
  hash.update(rel + '\n');
  hash.update(buf);
}
const digest = hash.digest();

const privateKey = crypto.createPrivateKey(fs.readFileSync(privateKeyPath));
const sig = crypto.sign(null, digest, privateKey);
fs.writeFileSync(path.join(dir, 'SIGNATURE'), sig.toString('hex') + '\n');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cpmod-'));
const staging = path.join(tmp, 'pkg');
fs.mkdirSync(staging);
for (const rel of [...files, 'SIGNATURE']) {
  const dest = path.join(staging, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(dir, rel), dest);
}

fs.mkdirSync(path.dirname(out), { recursive: true });
if (fs.existsSync(out)) fs.unlinkSync(out);
execFileSync('zip', ['-r', '-q', out, '.'], { cwd: staging });
fs.rmSync(tmp, { recursive: true, force: true });

console.log('Packed', out);
console.log('sha256=', digest.toString('hex'));
console.log('signature=', sig.toString('hex'));
console.log('Next: Root registers publisher (if needed) → Import ZIP at /dashboard/module-apps');
