import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

// ./local.db es relativo al cwd del proceso: en el droplet pm2 corre desde
// ~/code/heich-gi, así que la base sobrevive a los git pull del deploy
const sqlite = new Database(env.DATABASE_URL ?? './local.db');
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
