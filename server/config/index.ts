import path from 'path';
import fs from 'fs';
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

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  JWT_SECRET: process.env.JWT_SECRET || 'brand4less-super-secret-jwt-key-2026',
  JWT_EXPIRY: '7d',
  DATA_DIR,
  UPLOADS_DIR,
  BACKUPS_DIR,
  DB_PATH,
  STORE_NAME: 'Brand 4 Less',
  STORE_TAGLINE: 'Quality Clothing & Accessories at Unbeatable Prices',
  STORE_ADDRESS: 'Shop # 12-14, Commercial Center, Main Boulevard',
  STORE_PHONE: '+92 300 1234567 / +92 321 7654321',
  CURRENCY: 'PKR',
  DEFAULT_STAFF_MAX_DISCOUNT_PERCENT: 10,
  DEFAULT_MIN_STOCK_ALERT: 3,
  RECEIPT_RETURN_POLICY: 'Items can be exchanged within 7 days with original receipt and price tags intact. No cash refund on discounted items.',
};
