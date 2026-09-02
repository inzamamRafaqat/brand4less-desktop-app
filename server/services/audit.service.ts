import { getDb } from '../database/db.js';
import { v4 as uuidv4 } from 'uuid';

export interface AuditLogEntry {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  ipOrDevice?: string;
}

export class AuditService {
  static log(entry: AuditLogEntry): void {
    try {
      const db = getDb();
      const insert = db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_value, new_value, ip_or_device)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insert.run(
        uuidv4(),
        entry.userId,
        entry.action,
        entry.entityType,
        entry.entityId || null,
        entry.oldValue ? JSON.stringify(entry.oldValue) : null,
        entry.newValue ? JSON.stringify(entry.newValue) : null,
        entry.ipOrDevice || 'Desktop App'
      );
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
  }

  static getLogs(filters?: { action?: string; entityType?: string; limit?: number; offset?: number }): any[] {
    const db = getDb();
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    let query = `
      SELECT a.*, u.full_name as user_name, u.role as user_role
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.action) {
      query += ` AND a.action = ?`;
      params.push(filters.action);
    }
    if (filters?.entityType) {
      query += ` AND a.entity_type = ?`;
      params.push(filters.entityType);
    }

    query += ` ORDER BY a.timestamp DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return db.prepare(query).all(...params);
  }
}
