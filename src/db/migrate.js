import { config } from '../config/index.js';
import { openAndMigrate } from './connection.js';

const db = openAndMigrate(config.dbPath);
console.log(`Esquema aplicado en ${config.dbPath}`);
db.close();
