import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../database/db.js';
import { CONFIG } from '../config/index.js';
import { v4 as uuidv4 } from 'uuid';

export class AuthService {
  static login(username: string, password: string) {
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username.trim()) as any;
    if (!user) {
      throw new Error('Invalid username or password.');
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid username or password.');
    }

    const payload = {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
    };

    const token = jwt.sign(payload, CONFIG.JWT_SECRET, { expiresIn: CONFIG.JWT_EXPIRY as any });
    return { token, user: payload };
  }

  static loginWithPin(pin: string) {
    const user = db.prepare('SELECT * FROM users WHERE pin_code = ? AND is_active = 1').get(pin.trim()) as any;
    if (!user) {
      throw new Error('Invalid PIN code.');
    }

    const payload = {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
    };

    const token = jwt.sign(payload, CONFIG.JWT_SECRET, { expiresIn: CONFIG.JWT_EXPIRY as any });
    return { token, user: payload };
  }

  static verifyAdminPin(pin: string): boolean {
    const admin = db.prepare("SELECT * FROM users WHERE role = 'ADMIN' AND pin_code = ? AND is_active = 1").get(pin.trim());
    return Boolean(admin);
  }

  static getUsers() {
    return db.prepare('SELECT id, username, full_name, role, phone, is_active, created_at FROM users ORDER BY created_at ASC').all();
  }

  static createUser(data: { username: string; pin: string; password?: string; fullName: string; role?: string; phone?: string }) {
    const id = uuidv4();
    const now = new Date().toISOString();
    const passwordHash = bcrypt.hashSync(data.password || '123456', 10);

    db.prepare(`
      INSERT INTO users (id, username, password_hash, pin_code, full_name, role, phone, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      id, data.username.trim(), passwordHash, data.pin.trim(),
      data.fullName.trim(), data.role || 'STAFF', data.phone || null, now
    );

    return db.prepare('SELECT id, username, full_name, role, phone, is_active, created_at FROM users WHERE id = ?').get(id);
  }
}
