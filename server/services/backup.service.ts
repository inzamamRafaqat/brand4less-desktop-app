import fs from 'fs';
import path from 'path';
import { db } from '../database/db.js';
import { CONFIG } from '../config/index.js';

export class BackupService {
  static createBackup(label: string = 'manual') {
    fs.mkdirSync(CONFIG.BACKUPS_DIR, { recursive: true });

    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-');
    const filename = `omniretail_backup_${label}_${dateStr}.db`;
    const destinationPath = path.join(CONFIG.BACKUPS_DIR, filename);

    // Escape Windows backslashes for SQLite VACUUM INTO
    const normalizedPath = destinationPath.replace(/\\/g, '/');

    try {
      db.prepare(`VACUUM INTO '${normalizedPath}'`).run();
    } catch (err: any) {
      console.error('SQLite VACUUM INTO failed, falling back to file copy:', err);
      fs.copyFileSync(CONFIG.DB_PATH, destinationPath);
    }

    const stats = fs.statSync(destinationPath);
    return {
      success: true,
      filename,
      sizeBytes: stats.size,
      sizeFormatted: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
      createdAt: now.toISOString(),
      path: destinationPath,
    };
  }

  static listBackups() {
    if (!fs.existsSync(CONFIG.BACKUPS_DIR)) return [];

    const files = fs.readdirSync(CONFIG.BACKUPS_DIR);
    return files
      .filter((f) => f.endsWith('.db'))
      .map((filename) => {
        const filePath = path.join(CONFIG.BACKUPS_DIR, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          sizeBytes: stats.size,
          sizeFormatted: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
          createdAt: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static restoreBackup(filename: string) {
    const backupFile = path.join(CONFIG.BACKUPS_DIR, filename);
    if (!fs.existsSync(backupFile)) {
      throw new Error(`Backup file "${filename}" not found in backups directory.`);
    }

    db.close();
    fs.copyFileSync(backupFile, CONFIG.DB_PATH);

    // Delete WAL and SHM files to ensure clean state
    const walFile = `${CONFIG.DB_PATH}-wal`;
    const shmFile = `${CONFIG.DB_PATH}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);

    return {
      success: true,
      message: `Database restored from "${filename}". Server restart recommended.`,
    };
  }
}
