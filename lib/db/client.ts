import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const DATABASE_URL = process.env.DATABASE_URL;

const sql = neon(DATABASE_URL ?? 'postgresql://placeholder');
export const db = drizzle(sql, { schema });

if (!DATABASE_URL && process.env.NODE_ENV !== 'production') {
  console.warn('DATABASE_URL is not set. Add it to .env.local');
}
