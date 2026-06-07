import { z } from 'zod';

export const TriageSchema = z.object({
  category: z.string(),
  subsystem: z.string(),
  routingTeam: z.string(),
  route: z.string(),
});

export const PrioritySchema = z.object({
  severity: z.enum(['P1', 'P2', 'P3', 'P4']),
  reasoning: z.string(),
  businessImpact: z.object({
    affectedServices: z.array(z.string()),
    impactSummary: z.string(),
    estUsers: z.number(),
  }),
});

export const ResolutionSchema = z.object({
  steps: z.array(z.string()),
  rationale: z.string(),
  runbookRefs: z.array(z.string()),
});

export type TriageOutput = z.infer<typeof TriageSchema>;
export type PriorityOutput = z.infer<typeof PrioritySchema>;
export type ResolutionOutput = z.infer<typeof ResolutionSchema>;
