import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log('Running migration...');

  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  console.log('✓ vector extension');

  await sql`DO $$ BEGIN
    CREATE TYPE incident_status AS ENUM ('open', 'in_progress', 'resolved');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`;

  await sql`DO $$ BEGIN
    CREATE TYPE incident_severity AS ENUM ('P1', 'P2', 'P3', 'P4');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`;
  console.log('✓ enums');

  await sql`CREATE TABLE IF NOT EXISTS incidents (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT NOT NULL,
    scenario_key  TEXT NOT NULL,
    title         TEXT NOT NULL,
    description   TEXT NOT NULL,
    status        incident_status NOT NULL DEFAULT 'open',
    severity      incident_severity,
    category      TEXT,
    assignee      TEXT,
    affected_services JSONB NOT NULL DEFAULT '[]',
    embedding     vector(384),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at   TIMESTAMPTZ
  )`;
  console.log('✓ incidents');

  await sql`CREATE TABLE IF NOT EXISTS incident_analysis (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id         UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    classification      JSONB,
    priority            JSONB,
    business_impact     JSONB,
    similar_incidents   JSONB,
    dedup_match         JSONB,
    resolution          JSONB,
    comms_draft         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  console.log('✓ incident_analysis');

  await sql`CREATE TABLE IF NOT EXISTS runbooks (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    title    TEXT NOT NULL,
    steps    JSONB NOT NULL
  )`;
  console.log('✓ runbooks');

  await sql`CREATE TABLE IF NOT EXISTS ticket_counter (
    id      INTEGER PRIMARY KEY DEFAULT 1,
    current INTEGER NOT NULL DEFAULT 1041
  )`;
  await sql`INSERT INTO ticket_counter (id, current) VALUES (1, 1041) ON CONFLICT DO NOTHING`;
  console.log('✓ ticket_counter');

  await sql`CREATE INDEX IF NOT EXISTS incidents_embedding_idx
    ON incidents USING hnsw (embedding vector_cosine_ops)`;
  console.log('✓ HNSW index on embedding');

  console.log('\nMigration complete.');
}

migrate().catch((err) => { console.error(err); process.exit(1); });
