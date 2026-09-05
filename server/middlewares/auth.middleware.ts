import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config/index.js';
import { hasPermission, Permission, UserRole } from '../domain/rbac.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
  };
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    return;
  }

  jwt.verify(token, CONFIG.JWT_SECRET, (err, user) => {
    if (err) {
      res.status(403).json({ success: false, message: 'Invalid or expired token.' });
      return;
    }
    req.user = user as AuthRequest['user'];
    next();
  });
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: `Access forbidden for role '${req.user?.role}'. Required: [${roles.join(', ')}]` });
      return;
    }
    next();
  };
}

export function requirePermission(permission: Permission) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !hasPermission(req.user.role, permission)) {
      res.status(403).json({ success: false, message: `Permission denied. Requires '${permission}'.` });
      return;
    }
    next();
  };
}
