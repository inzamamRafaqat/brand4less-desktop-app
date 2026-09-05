import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config/index.js';

// Ensure data and backup directories exist
fs.mkdirSync(path.dirname(CONFIG.DB_PATH), { recursive: true });
fs.mkdirSync(CONFIG.UPLOADS_DIR, { recursive: true });
fs.mkdirSync(CONFIG.BACKUPS_DIR, { recursive: true });

export const db: Database.Database = new Database(CONFIG.DB_PATH, {
  // verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
});

// Configure High-Performance SQLite Pragmas
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');
db.pragma('temp_store = MEMORY');
db.pragma('cache_size = -64000'); // 64MB Cache

/**
 * Initialize Schema from SQL File
 */
export function initializeDatabase() {
  const schemaPath = path.join(import.meta.dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  }
}
