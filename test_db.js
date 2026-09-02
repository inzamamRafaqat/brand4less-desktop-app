const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

try {
  console.log('Testing better-sqlite3...');
  const dbPath = path.join(__dirname, 'test.db');
  const db = new Database(dbPath);
  console.log('Database opened at', dbPath);
  const pragmaRes = db.pragma('journal_mode = WAL');
  console.log('WAL response:', pragmaRes);
  db.prepare('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)').run();
  db.prepare('INSERT INTO test (name) VALUES (?)').run('Brand 4 Less');
  const row = db.prepare('SELECT * FROM test').get();
  console.log('Row inserted and selected:', row);
  db.close();
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  const shm = dbPath + '-shm';
  const wal = dbPath + '-wal';
  if (fs.existsSync(shm)) fs.unlinkSync(shm);
  if (fs.existsSync(wal)) fs.unlinkSync(wal);
  console.log('All SQLite tests passed successfully!');
} catch (err) {
  console.error('Error in SQLite test:', err);
  process.exit(1);
}
