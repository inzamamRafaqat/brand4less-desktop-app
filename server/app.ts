import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { CONFIG } from './config/index.js';
import { runMigrations } from './database/migrations.js';
import { seedDatabase } from './database/seed.js';
import { apiRouter } from './routes/api.router.js';

export function createApp(): express.Application {
  const app = express();

  app.set('trust proxy', 'loopback');

  // The app is a same-origin desktop client. Allow only the local dev UI origin
  // and same-origin requests; do not reflect arbitrary origins.
  const allowedOrigins = new Set<string>([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    `http://localhost:${CONFIG.PORT}`,
    `http://127.0.0.1:${CONFIG.PORT}`,
  ]);
  if (process.env.CORS_ORIGIN) {
    process.env.CORS_ORIGIN.split(',').forEach((o) => allowedOrigins.add(o.trim()));
  }

  app.use(
    cors({
      origin: (origin, cb) => {
        // Non-browser / same-origin requests send no Origin header.
        if (!origin || allowedOrigins.has(origin)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Static uploads directory for images and attachments.
  // Harden against a stored file being interpreted as an active document
  // (html/svg/script) served from the app's own origin.
  app.use(
    '/uploads',
    express.static(CONFIG.UPLOADS_DIR, {
      index: false,
      dotfiles: 'deny',
      setHeaders: (res, filePath) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
        const ext = filePath.toLowerCase().slice(filePath.lastIndexOf('.'));
        if (!['.png', '.jpg', '.jpeg', '.webp', '.gif', '.pdf'].includes(ext)) {
          res.setHeader('Content-Disposition', 'attachment');
        }
      },
    })
  );

  // Health Check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected (SQLite WAL)',
    });
  });

  // API Routes
  app.use('/api', apiRouter);

  // In production the built React UI is served from this same origin, so the
  // Electron shell can load http://127.0.0.1:<port> and every relative /api and
  // /uploads request just works (no file:// origin, no cross-origin surface).
  const here = path.dirname(fileURLToPath(import.meta.url));
  const uiCandidates = [
    path.resolve(process.cwd(), 'dist'),
    path.resolve(here, '../dist'),
    path.resolve(here, '../../dist'),
  ];
  const uiDir = uiCandidates.find((p) => fs.existsSync(path.join(p, 'index.html')));

  if (uiDir) {
    app.use(express.static(uiDir, { index: false }));
    app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => {
      res.sendFile(path.join(uiDir, 'index.html'));
    });
  }

  // Global Error Handler — never leak internal error details to the client.
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // Multer / validation errors are safe, caller-facing messages.
    const isClientError =
      err?.name === 'MulterError' ||
      err?.status === 400 ||
      err?.message === 'Not allowed by CORS' ||
      err?.expose === true;

    if (isClientError) {
      res.status(err.status || 400).json({ success: false, message: err.message });
      return;
    }

    console.error('Server error:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  });

  return app;
}

export function initServer(): express.Application {
  // Initialize Database Schema & Seed Data
  runMigrations();
  seedDatabase();

  return createApp();
}
