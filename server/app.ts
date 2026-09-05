import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/api.router.js';
import { CONFIG } from './config/index.js';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static uploads serving
app.use('/uploads', express.static(CONFIG.UPLOADS_DIR));

// API Router
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: 'OmniRetail Enterprise Engine', timestamp: new Date().toISOString() });
});
