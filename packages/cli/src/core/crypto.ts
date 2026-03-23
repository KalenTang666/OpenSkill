/**
 * OpenSkill — Cryptographic Layer
 * Ed25519 signing & verification for OSP Protocol
 */
import { createHash, generateKeyPairSync, sign, verify, randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const KEYS_DIR = join(homedir(), '.openskill', 'keys');
const PRIVATE_KEY_FILE = join(KEYS_DIR, 'private.key');
const PUBLIC_KEY_FILE = join(KEYS_DIR, 'public.key');

export interface KeyPair {
  publicKey: string;   // hex-encoded
  privateKey: string;  // hex-encoded (encrypted at rest)
}

export interface SignatureResult {
  signature: string;   // hex
  publicKey: string;   // hex
  hash: string;        // sha256 hex of content
}

/** Generate a content-addressable ID */
export function contentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/** Generate OSP asset ID */
export function ospId(type: string, content: string): string {
  return `osp:${type}:${contentHash(content).slice(0, 16)}`;
}

/** Generate Ed25519 keypair and store locally */
export function generateKeys(passphrase?: string): KeyPair {
  if (!existsSync(KEYS_DIR)) mkdirSync(KEYS_DIR, { recursive: true });

  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  // Encrypt private key if passphrase provided
  const privKeyData = passphrase ? encryptKey(privateKey, passphrase) : privateKey;

  writeFileSync(PRIVATE_KEY_FILE, privKeyData, 'utf-8');
  writeFileSync(PUBLIC_KEY_FILE, publicKey, 'utf-8');

  const pubHex = createHash('sha256').update(publicKey).digest('hex').slice(0, 32);
  return { publicKey: pubHex, privateKey: '[encrypted]' };
}

/** Check if keys exist */
export function hasKeys(): boolean {
  return existsSync(PRIVATE_KEY_FILE) && existsSync(PUBLIC_KEY_FILE);
}

/** Get public key hex */
export function getPublicKeyHex(): string {
  if (!existsSync(PUBLIC_KEY_FILE)) throw new Error('No keys found. Run `oski init` with --generate-keys.');
  const pem = readFileSync(PUBLIC_KEY_FILE, 'utf-8');
  return createHash('sha256').update(pem).digest('hex').slice(0, 32);
}

/** Sign content */
export function signContent(content: string, passphrase?: string): SignatureResult {
  if (!existsSync(PRIVATE_KEY_FILE)) throw new Error('No private key found.');

  let privPem = readFileSync(PRIVATE_KEY_FILE, 'utf-8');
  if (passphrase && privPem.startsWith('ENC:')) {
    privPem = decryptKey(privPem, passphrase);
  }

  const hash = contentHash(content);
  const signature = sign(null, Buffer.from(hash), privPem).toString('hex');
  const publicKey = getPublicKeyHex();

  return { signature, publicKey, hash };
}

/** Verify a signature */
export function verifySignature(content: string, signature: string, publicKeyPem: string): boolean {
  try {
    const hash = contentHash(content);
    return verify(null, Buffer.from(hash), publicKeyPem, Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

/** Encrypt private key with passphrase */
function encryptKey(pem: string, passphrase: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(passphrase, salt, 32);
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(pem, 'utf-8'), cipher.final()]);
  return `ENC:${salt.toString('hex')}:${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

/** Decrypt private key */
function decryptKey(encData: string, passphrase: string): string {
  const [, saltHex, ivHex, dataHex] = encData.split(':');
  const key = scryptSync(passphrase, Buffer.from(saltHex, 'hex'), 32);
  const decipher = createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf-8');
}
