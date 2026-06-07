import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getAllIncidentsAction } from '@/lib/actions/incidents';
import { computeMetrics } from '@/lib/mock-data';
import { MetricsRow } from '@/components/dashboard/metrics-row';
import { SeverityPie, CategoryBar } from '@/components/dashboard/severity-chart';
import { IncidentList } from '@/components/incidents/incident-list';
import { RefreshButton } from '@/components/dashboard/refresh-button';
import type { Incident } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const rows = await getAllIncidentsAction();

  const incidents: Incident[] = rows.map((i) => ({
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

  const metrics = computeMetrics(incidents);
  const recent  = incidents.slice(0, 10);

  const kpis = [
    {
      label:      'Active Incidents',
      value:      metrics.totalActive,
      sub:        'open or in-progress',
      highlight:  metrics.totalActive > 3 ? ('danger' as const) : ('neutral' as const),
      trend:      'up' as const,
      trendLabel: `${metrics.totalActive} now`,
    },
    {
      label:     'P1 Critical',
      value:     metrics.p1Active,
      sub:       'need immediate action',
      highlight: metrics.p1Active > 0 ? ('danger' as const) : ('ok' as const),
    },
    {
      label:      'Avg MTTR',
      value:      metrics.mttrMin > 0 ? `${metrics.mttrMin}m` : '—',
      sub:        'mean time to resolve',
      highlight:  metrics.mttrMin > 60 ? ('warning' as const) : ('ok' as const),
      trend:      'down' as const,
      trendLabel: metrics.resolvedCount > 0 ? `from ${metrics.resolvedCount} resolved` : 'no resolved yet',
    },
    {
      label:     'Total Resolved',
      value:     metrics.resolvedCount,
      sub:       'all-time',
      highlight: 'neutral' as const,
    },
  ];

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Operations Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1.5">{incidents.length} incidents tracked</p>
        </div>
        <div className="flex items-center gap-3">
          <RefreshButton />
          <Link
            href="/catalog"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Incident
          </Link>
        </div>
      </div>

      <MetricsRow metrics={kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SeverityPie data={metrics.severityDist} />
        <CategoryBar data={metrics.categoryDist} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Incidents</h2>
          <Link href="/incidents" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        <IncidentList incidents={recent} />
      </div>
    </div>
  );
}
