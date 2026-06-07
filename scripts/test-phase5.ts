import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { incidents, incidentAnalysis } from '../lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { pushIncidentEvent } from '../lib/dynatrace';
import { generatePostmortem } from '../lib/agents/postmortem';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db  = drizzle(sql, { schema: { incidents, incidentAnalysis } });

  // 1. Pick the most recently analyzed incident
  const [incident] = await db.select().from(incidents).orderBy(desc(incidents.createdAt)).limit(1);
  if (!incident) { console.error('No incidents — run seed + test-agent first'); process.exit(1); }

  console.log(`Using: ${incident.ticketNumber} — ${incident.title}`);

  // 2. Test Dynatrace push (mock if no env vars)
  console.log('\n── Dynatrace push ──');
  await pushIncidentEvent({
    ticketNumber:     incident.ticketNumber,
    title:            incident.title,
    severity:         incident.severity,
    category:         incident.category,
    affectedServices: incident.affectedServices as string[],
  });
  console.log('✓ Dynatrace push done');

  // 3. Mark as resolved + generate postmortem
  console.log('\n── Postmortem (resolve → LLM call) ──');
  await db.update(incidents)
    .set({ status: 'resolved', resolvedAt: new Date() })
    .where(eq(incidents.id, incident.id));

  await generatePostmortem(incident.id);

  // 4. Verify it landed
  const [analysis] = await db
    .select()
    .from(incidentAnalysis)
    .where(eq(incidentAnalysis.incidentId, incident.id));

  console.log('\nPost-mortem draft:');
  console.log(analysis?.commsDraft ?? '(none)');
  console.log('\n✅ Phase 5 smoke test complete');
}

main().catch((err) => { console.error(err); process.exit(1); });
