import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/index.js';

for (const suffix of ['', '-wal', '-shm']) {
  const file = `${config.dbPath}${suffix}`;
  if (fs.existsSync(file)) {
    fs.rmSync(file);
    console.log(`Eliminado: ${file}`);
  }
}
console.log('Base de datos reiniciada. Ejecute `npm run migrate` para recrearla.');
