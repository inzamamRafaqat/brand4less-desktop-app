import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

// Every test file talks to the same on-disk SQLite database — server/database/db.ts
// hands back a singleton keyed off CONFIG.DB_PATH — so the files cannot run in
// parallel without corrupting each other's aggregate assertions (dashboard/P&L).
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      fileParallelism: false,
      testTimeout: 20000,
      env: {
        DB_PATH: './data/test.db',
      },
    },
  })
);
