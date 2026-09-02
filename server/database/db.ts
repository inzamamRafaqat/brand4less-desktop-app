import Database from 'better-sqlite3';
import { CONFIG } from '../config/index.js';
import fs from 'fs';
import path from 'path';

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    const dir = path.dirname(CONFIG.DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    dbInstance = new Database(CONFIG.DB_PATH);
    
    // Configure SQLite performance and integrity flags
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
    dbInstance.pragma('synchronous = NORMAL');
    dbInstance.pragma('cache_size = -64000'); // 64MB cache
    dbInstance.pragma('temp_store = MEMORY');
  }
  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Execute a function inside an immediate SQLite transaction.
 * Rolls back automatically on error.
 */
export function runTransaction<T>(fn: (db: Database.Database) => T): T {
  const db = getDb();
  const transaction = db.transaction(() => {
    return fn(db);
  });
  return transaction.immediate();
}
