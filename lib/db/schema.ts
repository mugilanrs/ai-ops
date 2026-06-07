import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  pgEnum,
  serial,
  integer,
  real,
} from 'drizzle-orm/pg-core';
import { vector } from 'drizzle-orm/pg-core';

// ── Enums ──────────────────────────────────────────────────────
export const statusEnum = pgEnum('incident_status', ['open', 'in_progress', 'resolved']);
export const severityEnum = pgEnum('incident_severity', ['P1', 'P2', 'P3', 'P4']);

// ── incidents ─────────────────────────────────────────────────
export const incidents = pgTable('incidents', {
  id:               uuid('id').primaryKey().defaultRandom(),
  ticketNumber:     text('ticket_number').notNull(),
  scenarioKey:      text('scenario_key').notNull(),
  title:            text('title').notNull(),
  description:      text('description').notNull(),
  status:           statusEnum('status').notNull().default('open'),
  severity:         severityEnum('severity'),
  category:         text('category'),
  assignee:         text('assignee'),
  affectedServices: jsonb('affected_services').$type<string[]>().notNull().default([]),
  embedding:        vector('embedding', { dimensions: 384 }),
  createdAt:        timestamp('created_at').notNull().defaultNow(),
  resolvedAt:       timestamp('resolved_at'),
});

// ── incident_analysis ─────────────────────────────────────────
export const incidentAnalysis = pgTable('incident_analysis', {
  id:                uuid('id').primaryKey().defaultRandom(),
  incidentId:        uuid('incident_id').notNull().references(() => incidents.id, { onDelete: 'cascade' }),
  classification:    jsonb('classification').$type<{
    category: string; subsystem: string; routingTeam: string;
  }>(),
  priority:          jsonb('priority').$type<{
    severity: string; reasoning: string;
  }>(),
  businessImpact:    jsonb('business_impact').$type<{
    affectedServices: string[]; impactSummary: string; estUsers: number;
  }>(),
  similarIncidents:  jsonb('similar_incidents').$type<{
    id: string; score: number; title: string; ticketNumber: string;
  }[]>(),
  dedupMatch:        jsonb('dedup_match').$type<{
    id: string; score: number; title: string; ticketNumber: string;
  } | null>(),
  resolution:        jsonb('resolution').$type<{
    steps: string[]; rationale: string; runbookRefs: string[];
  }>(),
  commsDraft:        text('comms_draft'),
  createdAt:         timestamp('created_at').notNull().defaultNow(),
});

// ── runbooks ──────────────────────────────────────────────────
export const runbooks = pgTable('runbooks', {
  id:       uuid('id').primaryKey().defaultRandom(),
  category: text('category').notNull(),
  title:    text('title').notNull(),
  steps:    jsonb('steps').$type<string[]>().notNull(),
});

// ── ticket counter ────────────────────────────────────────────
export const ticketCounter = pgTable('ticket_counter', {
  id:      integer('id').primaryKey().default(1),
  current: integer('current').notNull().default(1041),
});

// ── Types inferred from schema ────────────────────────────────
export type Incident       = typeof incidents.$inferSelect;
export type NewIncident    = typeof incidents.$inferInsert;
export type IncidentAnalysis = typeof incidentAnalysis.$inferSelect;
export type Runbook        = typeof runbooks.$inferSelect;
