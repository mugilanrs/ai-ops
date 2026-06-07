import { ChatGroq } from '@langchain/groq';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { incidents, incidentAnalysis } from '@/lib/db/schema';

const GROQ_8B = 'llama-3.1-8b-instant';

export async function generatePostmortem(incidentId: string): Promise<void> {
  const sql = neon(process.env.DATABASE_URL!);
  const db  = drizzle(sql, { schema: { incidents, incidentAnalysis } });

  const [[incident], [analysis]] = await Promise.all([
    db.select().from(incidents).where(eq(incidents.id, incidentId)),
    db.select().from(incidentAnalysis).where(eq(incidentAnalysis.incidentId, incidentId)),
  ]);

  if (!incident) return;

  const mttrMin =
    incident.resolvedAt && incident.createdAt
      ? Math.round(
          (incident.resolvedAt.getTime() - incident.createdAt.getTime()) / 60_000,
        )
      : null;

  const resolutionText = analysis?.resolution
    ? (analysis.resolution as { steps: string[]; rationale: string }).steps.join('\n')
    : 'No resolution recorded.';

  const llm  = new ChatGroq({ model: GROQ_8B, temperature: 0.4 });
  const resp = await llm.invoke([
    {
      role: 'system',
      content: `You are an SRE writing a concise post-mortem (5–8 sentences).
Cover: what happened, root cause, customer impact, timeline, and key learnings. Be direct and factual. No bullet points — prose only.`,
    },
    {
      role: 'user',
      content: `Incident: ${incident.title}
Description: ${incident.description}
Severity: ${incident.severity ?? 'unknown'} | Category: ${incident.category ?? 'unknown'}
${mttrMin !== null ? `Time to resolve: ${mttrMin} minutes` : ''}
Steps taken:
${resolutionText}`,
    },
  ]);

  const postmortem = typeof resp.content === 'string' ? resp.content : null;
  if (!postmortem) return;

  if (analysis) {
    await db
      .update(incidentAnalysis)
      .set({ commsDraft: postmortem })
      .where(eq(incidentAnalysis.incidentId, incidentId));
  }
}
