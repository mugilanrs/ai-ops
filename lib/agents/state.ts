import { Annotation } from '@langchain/langgraph';
import type { Incident } from '@/lib/db/schema';
import type { TriageOutput, PriorityOutput, ResolutionOutput } from './schemas';

export type SimilarIncident = {
  id: string;
  score: number;
  title: string;
  ticketNumber: string;
};

export const GraphAnnotation = Annotation.Root({
  incident: Annotation<Incident>(),
  classification: Annotation<TriageOutput | null>({ default: () => null, reducer: (_, b) => b }),
  priority: Annotation<PriorityOutput | null>({ default: () => null, reducer: (_, b) => b }),
  similar: Annotation<SimilarIncident[]>({ default: () => [], reducer: (_, b) => b }),
  dedupMatch: Annotation<SimilarIncident | null>({ default: () => null, reducer: (_, b) => b }),
  resolution: Annotation<ResolutionOutput | null>({ default: () => null, reducer: (_, b) => b }),
  commsDraft: Annotation<string | null>({ default: () => null, reducer: (_, b) => b }),
});

export type GraphState = typeof GraphAnnotation.State;
