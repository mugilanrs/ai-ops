export type Severity = 'P1' | 'P2' | 'P3' | 'P4';
export type IncidentStatus = 'open' | 'in_progress' | 'resolved';

export interface Incident {
  id: string;
  ticketNumber: string;
  scenarioKey: string;
  title: string;
  description: string;
  status: IncidentStatus;
  severity: Severity | null;
  category: string | null;
  assignee: string | null;
  affectedServices: string[];
  createdAt: string;
  resolvedAt: string | null;
}

export interface Scenario {
  key: string;
  title: string;
  description: string;
  category: string;
  affectedServices: string[];
  defaultSeverity: Severity;
  metrics: { label: string; value: string; alert: boolean }[];
  icon: string;
  tags: string[];
}

export interface IncidentAnalysis {
  incidentId: string;
  classification: {
    category: string;
    subsystem: string;
    routingTeam: string;
  };
  priority: {
    severity: Severity;
    reasoning: string;
  };
  businessImpact: {
    affectedServices: string[];
    impactSummary: string;
    estUsers: number;
  };
  similarIncidents: { id: string; score: number; title: string; ticketNumber: string }[];
  resolution: {
    steps: string[];
    rationale: string;
    runbookRefs: string[];
  };
  commsDraft: string | null;
  createdAt: string;
}
