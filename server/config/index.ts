import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 4001,
  JWT_SECRET: process.env.JWT_SECRET || 'omniretail_enterprise_jwt_super_secret_key_2026',
  JWT_EXPIRY: '7d',
  DB_PATH: process.env.DB_PATH || path.join(process.cwd(), 'data', 'omniretail.db'),
  UPLOADS_DIR: path.join(process.cwd(), 'data', 'uploads'),
  BACKUPS_DIR: path.join(process.cwd(), 'data', 'backups'),
};
