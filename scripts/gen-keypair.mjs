#!/usr/bin/env node
/**
 * Generate Ed25519 keypair for CPMOD publishers.
 * Usage: node scripts/gen-keypair.mjs --out-dir ./keys
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const outDir = arg('--out-dir', './keys');
fs.mkdirSync(outDir, { recursive: true });

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const pubPem = publicKey.export({ type: 'spki', format: 'pem' });
const pubRaw = publicKey.export({ type: 'spki', format: 'der' });
const rawPub = Buffer.from(pubRaw).subarray(pubRaw.length - 32);

fs.writeFileSync(path.join(outDir, 'private.pem'), privPem);
fs.writeFileSync(path.join(outDir, 'public.pem'), pubPem);
fs.writeFileSync(path.join(outDir, 'public.raw.hex'), rawPub.toString('hex') + '\n');

console.log('Wrote:', path.join(outDir, 'private.pem'));
console.log('Wrote:', path.join(outDir, 'public.pem'));
console.log('Wrote:', path.join(outDir, 'public.raw.hex'), '(paste into Root Module Apps → Publisher)');
console.log('public_key_hex=', rawPub.toString('hex'));
