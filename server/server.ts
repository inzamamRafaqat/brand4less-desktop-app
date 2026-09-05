import { app } from './app.js';
import { CONFIG } from './config/index.js';
import { initializeDatabase } from './database/db.js';
import { seedDatabase } from './database/seed.js';

// 1. Initialize SQLite Database Schema & Multi-Industry Seed Data
initializeDatabase();
seedDatabase('APPAREL');

// 2. Start Express Server
app.listen(CONFIG.PORT, '0.0.0.0', () => {
  console.log(`🚀 OmniRetail Core Engine running on http://127.0.0.1:${CONFIG.PORT}`);
  console.log(`📦 Database: ${CONFIG.DB_PATH}`);
  console.log(`📁 Uploads Directory: ${CONFIG.UPLOADS_DIR}`);
});
