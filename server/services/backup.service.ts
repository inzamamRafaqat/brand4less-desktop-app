import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { getDb, closeDb } from '../database/db.js';
import { CONFIG } from '../config/index.js';
import { AuditService } from './audit.service.js';
import { runMigrations } from '../database/migrations.js';

export interface BackupInfo {
  filename: string;
  filepath: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  isValid: boolean;
}

export class BackupService {
  /**
   * Creates a consistent, hot SQLite database backup using VACUUM INTO.
   */
  static createBackup(customLabel?: string): BackupInfo {
    const db = getDb();
    if (!fs.existsSync(CONFIG.BACKUPS_DIR)) {
      fs.mkdirSync(CONFIG.BACKUPS_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const label = customLabel ? `_${customLabel.replace(/[^a-zA-Z0-9_-]/g, '')}` : '';
    const filename = `brand4less_backup_${timestamp}${label}.db`;
    const targetPath = path.join(CONFIG.BACKUPS_DIR, filename);

    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }

    // Execute SQLite VACUUM INTO for 100% consistent transactional hot backup
    const sqlPath = targetPath.replace(/\\/g, '/').replace(/'/g, "''");
    db.prepare(`VACUUM INTO '${sqlPath}'`).run();

    // Verify backup integrity
    const isValid = this.verifyBackupIntegrity(targetPath);
    const stats = fs.statSync(targetPath);

    return {
      filename,
      filepath: targetPath,
      sizeBytes: stats.size,
      sizeFormatted: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
      createdAt: new Date().toISOString(),
      isValid,
    };
  }

  /**
   * Validates SQLite database integrity.
   */
  static verifyBackupIntegrity(filepath: string): boolean {
    try {
      const testDb = new Database(filepath, { readonly: true });
      const result = testDb.pragma('integrity_check', { simple: true });
      testDb.close();
      return result === 'ok';
    } catch (err) {
      console.error('Backup integrity check failed:', err);
      return false;
    }
  }

  /**
   * Lists all existing backups sorted by newest first.
   */
  static listBackups(): BackupInfo[] {
    if (!fs.existsSync(CONFIG.BACKUPS_DIR)) return [];

    const files = fs.readdirSync(CONFIG.BACKUPS_DIR).filter((f) => f.endsWith('.db'));
    const list: BackupInfo[] = [];

    for (const file of files) {
      const fullPath = path.join(CONFIG.BACKUPS_DIR, file);
      try {
        const stats = fs.statSync(fullPath);
        list.push({
          filename: file,
          filepath: fullPath,
          sizeBytes: stats.size,
          sizeFormatted: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
          createdAt: stats.mtime.toISOString(),
          isValid: true,
        });
      } catch (e) {
        // Skip unreadable file
      }
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Restores database from a selected backup file.
   */
  static restoreBackup(filename: string, userId: string): boolean {
    const backupPath = path.join(CONFIG.BACKUPS_DIR, filename);
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file ${filename} does not exist.`);
    }

    // 1. Verify backup file integrity
    if (!this.verifyBackupIntegrity(backupPath)) {
      throw new Error('Target backup file failed SQLite integrity check. Restore aborted.');
    }

    // 2. Take a pre-restore safety snapshot of current DB
    try {
      this.createBackup('pre_restore_safety');
    } catch (e) {
      console.warn('Pre-restore safety backup skipped');
    }

    // 3. Close active database instance
    closeDb();

    // 4. Overwrite main DB file
    fs.copyFileSync(backupPath, CONFIG.DB_PATH);

    // Clean up any stale WAL or SHM files
    const walFile = `${CONFIG.DB_PATH}-wal`;
    const shmFile = `${CONFIG.DB_PATH}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);

    // 5. Re-initialize database & run migrations to ensure compatibility
    runMigrations();

    AuditService.log({
      userId,
      action: 'RESTORE_DATABASE',
      entityType: 'SYSTEM',
      newValue: { restoredFrom: filename },
    });

    return true;
  }
}
