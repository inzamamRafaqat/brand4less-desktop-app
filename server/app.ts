import express from 'express';
import cors from 'cors';
import path from 'path';
import { CONFIG } from './config/index.js';
import { runMigrations } from './database/migrations.js';
import { seedDatabase } from './database/seed.js';
import { apiRouter } from './routes/api.router.js';

export function createApp(): express.Application {
  const app = express();

  // Middleware
  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Static uploads directory for images and attachments
  app.use('/uploads', express.static(CONFIG.UPLOADS_DIR));

  // Health Check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      app: CONFIG.STORE_NAME,
      timestamp: new Date().toISOString(),
      database: 'connected (SQLite WAL)',
    });
  });

  // API Routes
  app.use('/api', apiRouter);

  // Global Error Handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Internal Server Error',
    });
  });

  return app;
}

export function initServer(): express.Application {
  // Initialize Database Schema & Seed Data
  runMigrations();
  seedDatabase();

  return createApp();
}
