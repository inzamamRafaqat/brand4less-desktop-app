import { getDb } from '../database/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from '../config/index.js';
import { AuditService } from './audit.service.js';
import { UserRole } from '../domain/rbac.js';

export class AuthService {
  /**
   * Standard login with username & password
   */
  static login(username: string, password: string): { token: string; user: any } {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username.trim().toLowerCase()) as any;

    if (!user) {
      throw new Error('Invalid username or password.');
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid username or password.');
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, fullName: user.full_name },
      CONFIG.JWT_SECRET,
      { expiresIn: CONFIG.JWT_EXPIRY }
    );

    const { password_hash, pin_code, ...safeUser } = user;
    return { token, user: safeUser };
  }

  /**
   * Fast POS Cashier Login with 4-digit PIN
   */
  static loginWithPin(pin: string): { token: string; user: any } {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE pin_code = ? AND is_active = 1').get(pin.trim()) as any;

    if (!user) {
      throw new Error('Invalid cashier PIN.');
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, fullName: user.full_name },
      CONFIG.JWT_SECRET,
      { expiresIn: CONFIG.JWT_EXPIRY }
    );

    const { password_hash, pin_code, ...safeUser } = user;
    return { token, user: safeUser };
  }

  /**
   * Verifies an Admin PIN for in-flight staff overrides (e.g. high discount or credit limit).
   */
  static verifyAdminPin(pin: string): boolean {
    const db = getDb();
    const admin = db.prepare("SELECT id FROM users WHERE pin_code = ? AND role IN ('ADMIN', 'MANAGER') AND is_active = 1").get(pin.trim());
    return !!admin;
  }

  /**
   * Get all active system users
   */
  static getUsers(): any[] {
    const db = getDb();
    return db.prepare('SELECT id, username, pin_code, full_name, role, is_active, created_at FROM users ORDER BY role ASC, full_name ASC').all();
  }

  /**
   * Create a new user account
   */
  static createUser(data: { username: string; password: string; pinCode?: string; fullName: string; role: UserRole }, currentUserId: string): any {
    const db = getDb();
    const id = uuidv4();
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(data.username.trim().toLowerCase());
    if (existing) throw new Error(`Username "${data.username}" already taken.`);

    const passwordHash = bcrypt.hashSync(data.password, 10);
    db.prepare(`
      INSERT INTO users (id, username, password_hash, pin_code, full_name, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(id, data.username.trim().toLowerCase(), passwordHash, data.pinCode || null, data.fullName.trim(), data.role);

    AuditService.log({
      userId: currentUserId,
      action: 'CREATE_USER',
      entityType: 'USER',
      entityId: id,
      newValue: { username: data.username, fullName: data.fullName, role: data.role },
    });

    return db.prepare('SELECT id, username, pin_code, full_name, role, is_active, created_at FROM users WHERE id = ?').get(id);
  }

  /**
   * Update existing user
   */
  static updateUser(id: string, data: { fullName?: string; role?: UserRole; password?: string; pinCode?: string; isActive?: number }, currentUserId: string): any {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (!existing) throw new Error('User not found');

    let passwordHash = existing.password_hash;
    if (data.password && data.password.trim()) {
      passwordHash = bcrypt.hashSync(data.password.trim(), 10);
    }

    db.prepare(`
      UPDATE users
      SET full_name = COALESCE(?, full_name),
          role = COALESCE(?, role),
          password_hash = ?,
          pin_code = COALESCE(?, pin_code),
          is_active = COALESCE(?, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      data.fullName?.trim() || null,
      data.role || null,
      passwordHash,
      data.pinCode !== undefined ? data.pinCode : null,
      data.isActive !== undefined ? data.isActive : null,
      id
    );

    AuditService.log({
      userId: currentUserId,
      action: 'UPDATE_USER',
      entityType: 'USER',
      entityId: id,
      oldValue: { username: existing.username, role: existing.role },
      newValue: data,
    });

    return db.prepare('SELECT id, username, pin_code, full_name, role, is_active, created_at FROM users WHERE id = ?').get(id);
  }

  // ── APP SETTINGS ────────────────────────────────────────────────────────
  static getSettings(): Record<string, string> {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM app_settings').all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    rows.forEach((r) => (settings[r.key] = r.value));
    return settings;
  }

  static updateSettings(settings: Record<string, string>, currentUserId: string): Record<string, string> {
    const db = getDb();
    const updateStmt = db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);

    for (const [key, value] of Object.entries(settings)) {
      updateStmt.run(key, String(value));
    }

    AuditService.log({
      userId: currentUserId,
      action: 'UPDATE_SETTINGS',
      entityType: 'SYSTEM',
      newValue: settings,
    });

    return this.getSettings();
  }
}
