import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { incidents } from '../lib/db/schema';
import { desc } from 'drizzle-orm';
import { analysisGraph } from '../lib/agents/graph';
import { persistAnalysis } from '../lib/agents/persist';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db  = drizzle(sql, { schema: { incidents } });

  const [incident] = await db.select().from(incidents).orderBy(desc(incidents.createdAt)).limit(1);
  if (!incident) { console.error('No incidents found — run seed first'); process.exit(1); }

  console.log(`Running agent on: ${incident.ticketNumber} — ${incident.title}\n`);

  const result = await analysisGraph.invoke({ incident });

  console.log('── Classification ──');
  console.log(JSON.stringify(result.classification, null, 2));
  console.log('\n── Priority ──');
  console.log(JSON.stringify(result.priority, null, 2));
  console.log('\n── Similar incidents ──');
  result.similar.forEach((s: { ticketNumber: string; title: string; score: number }) =>
    console.log(`  ${s.ticketNumber} (${s.score.toFixed(3)}) ${s.title}`)
  );
  console.log('\n── Dedup match ──', result.dedupMatch ?? 'none');
  console.log('\n── Resolution ──');
  console.log(JSON.stringify(result.resolution, null, 2));
  console.log('\n── Comms draft ──');
  console.log(result.commsDraft ?? '(none — P3/P4)');

  await persistAnalysis(result);
  console.log('\n✅ Analysis persisted to incident_analysis table');
}

main().catch((err) => { console.error(err); process.exit(1); });
