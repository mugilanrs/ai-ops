'use server';

import { db } from '@/lib/db/client';
import { incidents, ticketCounter } from '@/lib/db/schema';
import { embed, incidentText } from '@/lib/embeddings';
import { eq, desc, sql } from 'drizzle-orm';
import type { IncidentStatus } from '@/lib/types';
import { analysisGraph } from '@/lib/agents/graph';
import { persistAnalysis } from '@/lib/agents/persist';
import { pushIncidentEvent } from '@/lib/dynatrace';

// ── Ticket number ─────────────────────────────────────────────
async function nextTicketNumber(): Promise<string> {
  const [row] = await db
    .update(ticketCounter)
    .set({ current: sql`current + 1` })
    .where(eq(ticketCounter.id, 1))
    .returning();
  return `INC-${row.current}`;
}

// ── Create ─────────────────────────────────────────────────────
export async function createIncidentAction(
  scenarioKey: string,
  title: string,
  description: string,
  affectedServices: string[],
  category: string
) {
  const [ticketNumber, embedding] = await Promise.all([
    nextTicketNumber(),
    embed(incidentText(title, description)),
  ]);

  const [incident] = await db
    .insert(incidents)
    .values({
      ticketNumber,
      scenarioKey,
      title,
      description,
      affectedServices,
      category,
      ...(embedding ? { embedding } : {}),
      status: 'open',
    })
    .returning();

  // Push to Dynatrace synchronously before the serverless function returns
  await pushIncidentEvent({
    ticketNumber:     incident.ticketNumber,
    title:            incident.title,
    severity:         incident.severity,
    category:         incident.category,
    affectedServices: incident.affectedServices as string[],
  }).catch((err) => console.error('[dynatrace]', err));

  // Run agent graph (fire-and-forget: don't block the redirect)
  analysisGraph
    .invoke({ incident })
    .then(persistAnalysis)
    .catch((err) => console.error('[agent] analysis failed:', err));

  return incident;
}

// ── Read ───────────────────────────────────────────────────────
export async function getIncidentAction(id: string) {
  const [incident] = await db
    .select()
    .from(incidents)
    .where(eq(incidents.id, id));
  return incident ?? null;
}

export async function getAllIncidentsAction() {
  return db.select().from(incidents).orderBy(desc(incidents.createdAt));
}

// ── Update ─────────────────────────────────────────────────────
export async function updateStatusAction(id: string, status: IncidentStatus) {
  const [updated] = await db
    .update(incidents)
    .set({
      status,
      resolvedAt: status === 'resolved' ? new Date() : null,
    })
    .where(eq(incidents.id, id))
    .returning();

  if (status === 'resolved') {
    const { generatePostmortem } = await import('@/lib/agents/postmortem');
    generatePostmortem(id).catch((err) => console.error('[postmortem]', err));
  }

  return updated;
}

export async function updateAssigneeAction(id: string, assignee: string | null) {
  const [updated] = await db
    .update(incidents)
    .set({ assignee })
    .where(eq(incidents.id, id))
    .returning();
  return updated;
}

export async function getAnalysisAction(incidentId: string) {
  const { incidentAnalysis } = await import('@/lib/db/schema');
  const [analysis] = await db
    .select()
    .from(incidentAnalysis)
    .where(eq(incidentAnalysis.incidentId, incidentId));
  return analysis ?? null;
}
