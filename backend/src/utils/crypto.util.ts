/**
 * Crypto Utility — AES-256-GCM encryption/decryption for sensitive data at rest.
 *
 * Key requirements:
 * - ENCRYPTION_KEY env var must be exactly 64 hex characters (32 bytes)
 * - Already-encrypted values are prefixed with "enc:v1:" to avoid double-encryption
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const TAG_LENGTH = 16;
const PREFIX = 'enc:v1:';

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('ENCRYPTION_KEY environment variable is not set.');
  }
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error(
      'ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). ' +
        "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(raw, 'hex');
}

/**
 * Validate ENCRYPTION_KEY at startup — call this in server.ts / app bootstrap.
 * Throws if key is missing or malformed.
 */
export function validateEncryptionKey(): void {
  getKey(); // will throw descriptively if invalid
}

/**
 * Encrypt a plaintext string.
 * Returns a string in format: enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 * If value is already encrypted (starts with prefix), returns it unchanged.
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;
  if (plaintext.startsWith(PREFIX)) return plaintext; // already encrypted

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a ciphertext string produced by encrypt().
 * If value does NOT start with prefix, returns it unchanged (legacy plaintext).
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ciphertext;
  if (!ciphertext.startsWith(PREFIX)) return ciphertext; // legacy plaintext, return as-is

  const key = getKey();
  const withoutPrefix = ciphertext.slice(PREFIX.length);
  const parts = withoutPrefix.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encryptedData = Buffer.from(encryptedHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Returns true if the value is encrypted with this utility.
 */
export function isEncrypted(value: string): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}
