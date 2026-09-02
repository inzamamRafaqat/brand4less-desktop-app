import { initServer } from './app.js';
import { CONFIG } from './config/index.js';

try {
  const app = initServer();

  const server = app.listen(CONFIG.PORT, CONFIG.HOST, () => {
    console.log(`🚀 Brand 4 Less Core API Engine is running on http://${CONFIG.HOST}:${CONFIG.PORT}`);
    console.log(`📦 Database: ${CONFIG.DB_PATH}`);
    console.log(`📁 Uploads Directory: ${CONFIG.UPLOADS_DIR}`);
  });

  process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.close(() => {
      process.exit(0);
    });
  });
} catch (err: any) {
  console.error('CRITICAL SERVER BOOTSTRAP ERROR:', err);
  process.exit(1);
}

