'use client';

import { Incident, IncidentStatus } from './types';

const INCIDENTS_KEY = 'aiops_incidents';
const COUNTER_KEY = 'aiops_ticket_counter';

function nextTicketNumber(): string {
  const n = parseInt(localStorage.getItem(COUNTER_KEY) ?? '1041', 10) + 1;
  localStorage.setItem(COUNTER_KEY, String(n));
  return `INC-${n}`;
}

export function getAllIncidents(): Incident[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(INCIDENTS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function getIncident(id: string): Incident | null {
  return getAllIncidents().find((i) => i.id === id) ?? null;
}

export function upsertIncident(incident: Incident): void {
  const all = getAllIncidents();
  const idx = all.findIndex((i) => i.id === incident.id);
  if (idx >= 0) {
    all[idx] = incident;
  } else {
    all.unshift(incident);
  }
  localStorage.setItem(INCIDENTS_KEY, JSON.stringify(all));
}

export function createIncident(scenarioKey: string, title: string, description: string, affectedServices: string[], category: string): Incident {
  const id = crypto.randomUUID();
  const incident: Incident = {
    id,
    ticketNumber: nextTicketNumber(),
    scenarioKey,
    title,
    description,
    status: 'open',
    severity: null,
    category,
    assignee: null,
    affectedServices,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
  upsertIncident(incident);
  return incident;
}

export function updateIncidentStatus(id: string, status: IncidentStatus): Incident | null {
  const incident = getIncident(id);
  if (!incident) return null;
  const updated: Incident = {
    ...incident,
    status,
    resolvedAt: status === 'resolved' ? new Date().toISOString() : incident.resolvedAt,
  };
  upsertIncident(updated);
  return updated;
}

export function updateIncidentAssignee(id: string, assignee: string): Incident | null {
  const incident = getIncident(id);
  if (!incident) return null;
  const updated = { ...incident, assignee };
  upsertIncident(updated);
  return updated;
}
