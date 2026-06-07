interface DynatraceEvent {
  eventType: 'CUSTOM_ALERT' | 'CUSTOM_INFO';
  title: string;
  properties: Record<string, string>;
}

interface IncidentSummary {
  ticketNumber: string;
  title: string;
  severity?: string | null;
  category?: string | null;
  affectedServices?: string[] | null;
}

export async function pushIncidentEvent(incident: IncidentSummary): Promise<void> {
  const envUrl = process.env.DYNATRACE_ENV_URL;
  const token  = process.env.DYNATRACE_API_TOKEN;

  const sev = incident.severity ?? 'unknown';
  const isHigh = sev === 'P1' || sev === 'P2';

  const event: DynatraceEvent = {
    eventType:  isHigh ? 'CUSTOM_ALERT' : 'CUSTOM_INFO',
    title:      `${incident.ticketNumber}: ${incident.title} (${sev})`,
    properties: {
      'incident.id':       incident.ticketNumber,
      'incident.severity': sev,
      'incident.category': incident.category ?? 'unknown',
      'incident.service':  (incident.affectedServices ?? [])[0] ?? 'unknown',
    },
  };

  if (!envUrl || !token) {
    console.log('[dynatrace] mock push (env vars not set):', event.title);
    return;
  }

  try {
    const res = await fetch(`${envUrl}/api/v2/events/ingest`, {
      method:  'POST',
      headers: {
        Authorization:  `Api-Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!res.ok) {
      console.error('[dynatrace] push failed:', res.status, await res.text());
    } else {
      console.log('[dynatrace] event pushed:', event.title);
    }
  } catch (err) {
    console.error('[dynatrace] network error:', err);
  }
}
