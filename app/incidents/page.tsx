import { getAllIncidentsAction } from '@/lib/actions/incidents';
import { IncidentList } from '@/components/incidents/incident-list';
import type { Incident } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Tab = 'active' | 'resolved' | 'all';

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab = (rawTab as Tab) ?? 'active';

  const rows = await getAllIncidentsAction();
  const all: Incident[] = rows.map((i) => ({
    id:               i.id,
    ticketNumber:     i.ticketNumber,
    scenarioKey:      i.scenarioKey,
    title:            i.title,
    description:      i.description,
    status:           i.status as Incident['status'],
    severity:         i.severity as Incident['severity'],
    category:         i.category,
    assignee:         i.assignee,
    affectedServices: (i.affectedServices ?? []) as string[],
    createdAt:        i.createdAt instanceof Date ? i.createdAt.toISOString() : String(i.createdAt),
    resolvedAt:       i.resolvedAt instanceof Date ? i.resolvedAt.toISOString() : (i.resolvedAt ?? null),
  }));

  const active   = all.filter((i) => i.status !== 'resolved');
  const resolved = all.filter((i) => i.status === 'resolved');
  const shown    = tab === 'active' ? active : tab === 'resolved' ? resolved : all;

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'active',   label: 'Active',   count: active.length },
    { id: 'resolved', label: 'Resolved', count: resolved.length },
    { id: 'all',      label: 'All',      count: all.length },
  ];

  return (
    <div className="flex flex-col gap-8 p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">All Incidents</h1>
        <p className="text-sm text-muted-foreground mt-1.5">{all.length} incidents tracked</p>
      </div>

      {/* Tabs (plain links so they work in a Server Component) */}
      <div className="flex gap-1 border-b border-border -mt-4">
        {tabs.map((t) => (
          <a
            key={t.id}
            href={`/incidents?tab=${t.id}`}
            className={`flex items-center gap-2.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {t.label}
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              tab === t.id ? 'bg-primary/15 text-primary' : 'bg-surface text-muted-foreground'
            }`}>
              {t.count}
            </span>
          </a>
        ))}
      </div>

      <IncidentList incidents={shown} />
    </div>
  );
}
