import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { incidentAnalysis, incidents } from '@/lib/db/schema';
import type { GraphState } from './state';

export async function persistAnalysis(state: GraphState): Promise<void> {
  const sql = neon(process.env.DATABASE_URL!);
  const db  = drizzle(sql, { schema: { incidentAnalysis, incidents } });

  await db.insert(incidentAnalysis).values({
    incidentId:       state.incident.id,
    classification:   state.classification ?? undefined,
    priority:         state.priority
      ? { severity: state.priority.severity, reasoning: state.priority.reasoning }
      : undefined,
    businessImpact:   state.priority?.businessImpact ?? undefined,
    similarIncidents: state.similar,
    dedupMatch:       state.dedupMatch ?? undefined,
    resolution:       state.resolution ?? undefined,
    commsDraft:       state.commsDraft ?? undefined,
  });

  // Promote severity back to the incident row so queries/dashboard can filter on it
  if (state.priority?.severity) {
    await db
      .update(incidents)
      .set({
        severity: state.priority.severity as 'P1' | 'P2' | 'P3' | 'P4',
        category: state.classification?.category ?? undefined,
      })
      .where(eq(incidents.id, state.incident.id));
  }
}
