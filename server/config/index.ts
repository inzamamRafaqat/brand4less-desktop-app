import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Ensure base data directories exist
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'brand4less.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

/**
 * Resolves the JWT signing secret.
 * Priority: JWT_SECRET env var → persisted local secret file → freshly generated 256-bit secret.
 * A hardcoded fallback is never used: it would let anyone holding the source forge admin tokens.
 */
function resolveJwtSecret(): string {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 16) {
    return process.env.JWT_SECRET.trim();
  }

  const secretFile = path.join(DATA_DIR, '.jwt-secret');
  try {
    if (fs.existsSync(secretFile)) {
      const existing = fs.readFileSync(secretFile, 'utf-8').trim();
      if (existing.length >= 32) return existing;
    }
    const generated = crypto.randomBytes(48).toString('base64url');
    fs.writeFileSync(secretFile, generated, { mode: 0o600 });
    console.warn(
      '⚠️  JWT_SECRET not set. Generated a persistent local secret at data/.jwt-secret. ' +
        'Set JWT_SECRET in the environment for production deployments.'
    );
    return generated;
  } catch (err) {
    // As an absolute last resort (read-only FS), use a per-process random secret.
    // Tokens will not survive a restart, which is safe though inconvenient.
    console.warn('⚠️  Could not persist a JWT secret; using an ephemeral per-process secret.');
    return crypto.randomBytes(48).toString('base64url');
  }
}

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '4890', 10),
  // Bind to loopback only by default so the POS/API surface is not exposed to the LAN.
  HOST: process.env.HOST || '127.0.0.1',
  JWT_SECRET: resolveJwtSecret(),
  JWT_EXPIRY: '7d',
  DATA_DIR,
  UPLOADS_DIR,
  BACKUPS_DIR,
  DB_PATH,
  STORE_NAME: 'Brand 4 Less',
  STORE_TAGLINE: 'fb: www.Brand4Less.Facebook.com',
  STORE_ADDRESS: 'College Road Near Faysal Bank Pakpattan',
  STORE_PHONE: '0300-6940177 / 0322-8402141',
  CURRENCY: 'PKR',
  // Store wall-clock offset from UTC, in hours. Pakistan is UTC+5, no DST.
  // Day/month report boundaries are computed in this zone; rows stay UTC.
  STORE_TZ_OFFSET_HOURS: parseInt(process.env.STORE_TZ_OFFSET_HOURS || '5', 10),
  DEFAULT_STAFF_MAX_DISCOUNT_PERCENT: 10,
  DEFAULT_MIN_STOCK_ALERT: 3,
  RECEIPT_RETURN_POLICY: 'Refund & Exchange 48 Hours | There is no gauranty of export Items.',
};

/**
 * Safely resolves a caller-supplied path to a file that MUST live directly inside `baseDir`.
 * Guards against path traversal (../, absolute paths, symlink-style escapes).
 * Returns the absolute path, or null if the input escapes `baseDir`.
 */
export function resolveInsideDir(baseDir: string, userPath: string): string | null {
  if (!userPath || typeof userPath !== 'string') return null;
  // Only ever trust the final path segment.
  const safeName = path.basename(userPath);
  if (!safeName || safeName === '.' || safeName === '..') return null;
  const resolved = path.resolve(baseDir, safeName);
  const normalizedBase = path.resolve(baseDir);
  if (resolved !== path.join(normalizedBase, safeName)) return null;
  if (!resolved.startsWith(normalizedBase + path.sep)) return null;
  return resolved;
}
