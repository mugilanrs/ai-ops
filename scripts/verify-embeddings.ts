/**
 * Quick sanity check — finds the 5 nearest neighbours for a test query.
 * Run with:  npx tsx scripts/verify-embeddings.ts
 */
import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql as drizzleSql } from 'drizzle-orm';
import * as schema from '../lib/db/schema';
import { embed, incidentText } from '../lib/embeddings';

const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

const TEST_QUERIES = [
  'database connection pool exhausted queries timing out',
  'redis cache miss thundering herd origin overload',
  'kubernetes pod OOM killed memory leak heap',
  'message queue consumer backlog growing orders delayed',
];

async function main() {
  for (const query of TEST_QUERIES) {
    console.log(`\nQuery: "${query}"`);
    const vec = await embed(query);
    const vecStr = `[${vec.join(',')}]`;

    const rows = await db.execute(drizzleSql`
      SELECT ticket_number, title, severity, category,
             1 - (embedding <=> ${vecStr}::vector) AS score
      FROM incidents
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vecStr}::vector
      LIMIT 5
    `);

    for (const r of rows.rows as { ticket_number: string; title: string; severity: string; score: number }[]) {
      console.log(`  ${r.score.toFixed(4)}  ${r.ticket_number}  [${r.severity}] ${r.title}`);
    }
  }
  console.log('\n✅ Verification done');
}

main().catch((e) => { console.error(e); process.exit(1); });
