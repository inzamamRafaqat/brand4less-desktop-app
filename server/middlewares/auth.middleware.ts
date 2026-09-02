import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config/index.js';
import { getDb } from '../database/db.js';
import { Permission, hasPermission, UserRole } from '../domain/rbac.js';

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: UserRole;
  fullName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  // Header is the primary source. A `?token=` query param is accepted only as a
  // fallback for browser-native downloads (<a href>) that cannot set headers.
  const token =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : typeof req.query.token === 'string' && req.query.token
        ? req.query.token
        : null;

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as AuthenticatedUser;
    const db = getDb();
    const user = db.prepare('SELECT id, username, role, full_name, is_active FROM users WHERE id = ?').get(decoded.id) as any;

    if (!user || user.is_active !== 1) {
      res.status(403).json({ success: false, message: 'User account is inactive or no longer exists.' });
      return;
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role as UserRole,
      fullName: user.full_name,
    };

    next();
  } catch (err) {
    res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user.role}' does not have access to this resource.`,
      });
      return;
    }

    next();
  };
}

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized.' });
      return;
    }

    if (!hasPermission(req.user.role, permission)) {
      res.status(403).json({
        success: false,
        message: `Permission denied. Requires '${permission}'.`,
      });
      return;
    }

    next();
  };
}
