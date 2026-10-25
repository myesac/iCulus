// ----------------------------------------------------------------------------------
//  Name:    crypto.ts
//  Author:  Mark Casey
//
//  Purpose: AES-256-GCM encryption for account credentials. The master key is
//           generated on first run and stored at server/data/master.key.
//
//  Exported API:
//   • encryptSecret(plaintext) → string
//   • decryptSecret(payload)   → string
// ----------------------------------------------------------------------------------

// ── Imports ────────────────────────────────────────────────
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { DATA_DIR, KEY_PATH } from './paths.js';

// ── Constants ──────────────────────────────────────────────
const KEY_BYTES = 32;

// ══ Master key ═════════════════════════════════════════════
function ensureMasterKey(): Buffer {

  mkdirSync(DATA_DIR, { recursive: true });

  if (existsSync(KEY_PATH)) {

    const hex = readFileSync(KEY_PATH, 'utf8').trim();

    if (/^[0-9a-f]{64}$/i.test(hex)) {

      return Buffer.from(hex, 'hex');
    }

    // Corrupt or legacy key file: replace it so the server still boots.
  }

  const key = randomBytes(KEY_BYTES);
  writeFileSync(KEY_PATH, key.toString('hex'), { encoding: 'utf8', flag: 'w' });

  return key;
}

const MASTER_KEY = ensureMasterKey();

// ══ Encryption ═════════════════════════════════════════════
/**
 * Encrypt a plaintext secret with AES-256-GCM. Output format:
 *   v1:<iv base64>:<authTag base64>:<ciphertext base64>
 */
export function encryptSecret(plaintext: string): string {

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', MASTER_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return ['v1', iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

// ══ Decryption ═════════════════════════════════════════════
export function decryptSecret(payload: string): string {

  const parts = payload.split(':');

  if (parts.length !== 4 || parts[0] !== 'v1') {

    throw new Error('Unsupported encrypted payload');
  }

  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = createDecipheriv('aes-256-gcm', MASTER_KEY, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
