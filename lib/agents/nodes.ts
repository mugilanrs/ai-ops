import { ChatGroq } from '@langchain/groq';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { cosineDistance, desc, isNotNull, ne, eq, and } from 'drizzle-orm';
import { embed, incidentText } from '@/lib/embeddings';
import { incidents, runbooks } from '@/lib/db/schema';
import { TriageSchema, PrioritySchema, ResolutionSchema } from './schemas';
import type { GraphState, SimilarIncident } from './state';

const GROQ_8B  = 'llama-3.1-8b-instant';
const GROQ_70B = 'llama-3.3-70b-versatile';
const DEDUP_THRESHOLD = 0.85;

function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema: { incidents, runbooks } });
}

// ── Triage ────────────────────────────────────────────────────────────────────
export async function triageNode(state: GraphState): Promise<Partial<GraphState>> {
  const llm = new ChatGroq({ model: GROQ_8B, temperature: 0 });
  const structured = llm.withStructuredOutput(TriageSchema);

  const result = await structured.invoke([
    {
      role: 'system',
      content: `You are an SRE triage agent. Classify the incident into a category, subsystem, routing team, and route.
Categories: database, api_gateway, memory, cpu, disk, cache, queue, network, security, unknown.
Routing teams: dba-team, platform-team, backend-team, infra-team, security-team.
Route should be one of: database, api, infrastructure, cache, queue, other.`,
    },
    {
      role: 'user',
      content: `Title: ${state.incident.title}\nDescription: ${state.incident.description}`,
    },
  ]);

  return { classification: result };
}

// ── Assess Priority ───────────────────────────────────────────────────────────
export async function assessPriorityNode(state: GraphState): Promise<Partial<GraphState>> {
  const llm = new ChatGroq({ model: GROQ_8B, temperature: 0 });
  const structured = llm.withStructuredOutput(PrioritySchema);

  const result = await structured.invoke([
    {
      role: 'system',
      content: `You are an SRE severity assessor. Assign P1–P4 severity and assess business impact.
P1: complete outage or data loss risk. P2: major degradation. P3: partial degradation. P4: minor/cosmetic.
Estimate affected users as a number (0 if unknown).`,
    },
    {
      role: 'user',
      content: `Title: ${state.incident.title}\nDescription: ${state.incident.description}\nAffected services: ${state.incident.affectedServices?.join(', ')}`,
    },
  ]);

  return { priority: result };
}

// ── Retrieve Context (no LLM) ─────────────────────────────────────────────────
export async function retrieveContextNode(state: GraphState): Promise<Partial<GraphState>> {
  const db = getDb();
  const vector = await embed(incidentText(state.incident.title, state.incident.description));

  if (!vector) {
    return { similar: [], dedupMatch: null };
  }

  const similarity = cosineDistance(incidents.embedding, vector);

  const rows = await db
    .select({
      id:           incidents.id,
      ticketNumber: incidents.ticketNumber,
      title:        incidents.title,
      status:       incidents.status,
      score:        similarity,
    })
    .from(incidents)
    .where(and(ne(incidents.id, state.incident.id), isNotNull(incidents.embedding)))
    .orderBy(similarity)
    .limit(6);

  const similar: SimilarIncident[] = rows
    .slice(0, 5)
    .map((r) => ({
      id:           r.id,
      ticketNumber: r.ticketNumber,
      title:        r.title,
      score:        1 - Number(r.score),
    }));

  const activeNearest = rows.find(
    (r) => r.status !== 'resolved' && 1 - Number(r.score) >= DEDUP_THRESHOLD,
  );
  const dedupMatch = activeNearest
    ? {
        id:           activeNearest.id,
        ticketNumber: activeNearest.ticketNumber,
        title:        activeNearest.title,
        score:        1 - Number(activeNearest.score),
      }
    : null;

  return { similar, dedupMatch };
}

// ── Recommend Resolution (tool-using 70B) ─────────────────────────────────────
export async function recommendResolutionNode(state: GraphState): Promise<Partial<GraphState>> {
  const db = getDb();
  const llm = new ChatGroq({ model: GROQ_70B, temperature: 0.2 });
  const structured = llm.withStructuredOutput(ResolutionSchema);

  // Inline tool results: fetch relevant runbook + past resolutions for context
  const category = state.classification?.category ?? 'unknown';

  const [runbookRows, pastRows] = await Promise.all([
    db.select().from(runbooks).where(eq(runbooks.category, category)).limit(2),
    (async () => {
      const vector = await embed(incidentText(state.incident.title, state.incident.description));
      if (!vector) return [];
      const similarity = cosineDistance(incidents.embedding, vector);
      return db
        .select({ title: incidents.title, resolution: incidents.id })
        .from(incidents)
        .where(and(eq(incidents.status, 'resolved'), isNotNull(incidents.embedding)))
        .orderBy(similarity)
        .limit(3);
    })(),
  ]);

  const runbookContext = runbookRows.length
    ? runbookRows.map((r) => `Runbook "${r.title}":\n${(r.steps as string[]).join('\n')}`).join('\n\n')
    : 'No runbook found for this category.';

  const similarContext = state.similar.length
    ? state.similar.slice(0, 3).map((s) => `- ${s.ticketNumber}: ${s.title}`).join('\n')
    : 'None';

  const result = await structured.invoke([
    {
      role: 'system',
      content: `You are an expert SRE resolution agent. Provide concrete, actionable remediation steps.
Reference runbooks and similar past incidents where relevant. Return 3–7 steps, a rationale, and runbook refs (titles only, empty array if none).`,
    },
    {
      role: 'user',
      content: `Incident: ${state.incident.title}
Description: ${state.incident.description}
Category: ${category} | Severity: ${state.priority?.severity ?? 'unknown'}
Business impact: ${state.priority?.businessImpact?.impactSummary ?? 'unknown'}

Similar past incidents:
${similarContext}

Relevant runbook:
${runbookContext}`,
    },
  ]);

  return { resolution: result };
}

// ── Action (comms draft for P1/P2 + Dynatrace push) ─────────────────────────
export async function actionNode(state: GraphState): Promise<Partial<GraphState>> {
  const severity = state.priority?.severity;
  let commsDraft: string | null = null;

  // Generate status-page comms for high-severity incidents
  if (severity === 'P1' || severity === 'P2') {
    const llm = new ChatGroq({ model: GROQ_8B, temperature: 0.3 });
    const resp = await llm.invoke([
      {
        role: 'system',
        content: 'You are an incident communications manager. Write a concise, professional status-page update (3–4 sentences). No jargon. State the impact and what is being done.',
      },
      {
        role: 'user',
        content: `Incident: ${state.incident.title}
Severity: ${severity}
Impact: ${state.priority?.businessImpact?.impactSummary}
Resolution steps in progress: ${state.resolution?.steps?.slice(0, 2).join('; ')}`,
      },
    ]);
    commsDraft = typeof resp.content === 'string' ? resp.content : null;
  }

  // Push Dynatrace event (fire-and-forget; mock if env vars absent)
  const { pushIncidentEvent } = await import('@/lib/dynatrace');
  pushIncidentEvent({
    ticketNumber:     state.incident.ticketNumber,
    title:            state.incident.title,
    severity:         severity,
    category:         state.classification?.category,
    affectedServices: state.incident.affectedServices as string[],
  }).catch((err) => console.error('[dynatrace]', err));

  return { commsDraft };
}
