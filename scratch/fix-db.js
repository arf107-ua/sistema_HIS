const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '../data/his.db');
try {
  const db = new Database(dbPath);
  db.exec('ALTER TABLE appointments ADD COLUMN version INTEGER DEFAULT 0;');
  console.log('Columna version añadida correctamente.');
} catch (err) {
  console.log(err.message);
}
