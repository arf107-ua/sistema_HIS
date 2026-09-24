import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

export function openDb(file = config.dbPath) {
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON');
  if (file !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL');
  }
  return db;
}

export function initSchema(db) {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);
  db.prepare(
    "INSERT OR IGNORE INTO sequences (name, value) VALUES ('hc_code', 0)"
  ).run();
  return db;
}

export function openAndMigrate(file = config.dbPath) {
  const db = openDb(file);
  initSchema(db);
  return db;
}
