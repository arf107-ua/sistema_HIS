import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT || 3000),
  dbPath: process.env.DB_PATH || path.resolve(__dirname, '../../data/his.db')
};

export default config;
