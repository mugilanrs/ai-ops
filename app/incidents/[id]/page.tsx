import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getIncidentAction, getAnalysisAction } from '@/lib/actions/incidents';
import { getScenario } from '@/lib/scenarios';
import { SeverityBadge, StatusBadge } from '@/components/severity-badge';
import { LifecycleControls } from '@/components/incidents/lifecycle-controls';
import { AnalysisPanel, type SerializedAnalysis } from '@/components/analysis/analysis-panel';
import { formatDistanceToNow } from '@/lib/time';
import { ArrowLeft, Clock, Server, User, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IncidentStatus, Severity } from '@/lib/types';

export const dynamic = 'force-dynamic';

const severityTopBar: Record<string, string> = {
  P1: 'border-t-red-500',
  P2: 'border-t-orange-500',
  P3: 'border-t-yellow-500',
  P4: 'border-t-blue-500',
};

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [rawIncident, rawAnalysis] = await Promise.all([
    getIncidentAction(id),
    getAnalysisAction(id),
  ]);

  if (!rawIncident) notFound();

  // Normalize dates for client components
  const incident = {
    id:               rawIncident.id,
    ticketNumber:     rawIncident.ticketNumber,
    scenarioKey:      rawIncident.scenarioKey,
    title:            rawIncident.title,
    description:      rawIncident.description,
    status:           rawIncident.status as IncidentStatus,
    severity:         rawIncident.severity as Severity | null,
    category:         rawIncident.category,
    assignee:         rawIncident.assignee,
    affectedServices: (rawIncident.affectedServices ?? []) as string[],
    createdAt:        rawIncident.createdAt instanceof Date ? rawIncident.createdAt.toISOString() : String(rawIncident.createdAt),
    resolvedAt:       rawIncident.resolvedAt instanceof Date ? rawIncident.resolvedAt.toISOString() : (rawIncident.resolvedAt ?? null),
  };

  const analysis: SerializedAnalysis | null = rawAnalysis
    ? {
        classification:   rawAnalysis.classification as SerializedAnalysis['classification'],
        priority:         rawAnalysis.priority as SerializedAnalysis['priority'],
        businessImpact:   rawAnalysis.businessImpact as SerializedAnalysis['businessImpact'],
        similarIncidents: rawAnalysis.similarIncidents as SerializedAnalysis['similarIncidents'],
        dedupMatch:       rawAnalysis.dedupMatch as SerializedAnalysis['dedupMatch'],
        resolution:       rawAnalysis.resolution as SerializedAnalysis['resolution'],
        commsDraft:       rawAnalysis.commsDraft,
      }
    : null;

  const scenario = getScenario(incident.scenarioKey);

  return (
    <div className="flex flex-col gap-6 p-8 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/incidents" className="hover:text-foreground transition-colors">Incidents</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="font-mono font-semibold text-foreground">{incident.ticketNumber}</span>
      </div>

      {/* Header card */}
      <div className={cn(
        'rounded-xl border-2 border-border bg-card p-6',
        incident.severity ? severityTopBar[incident.severity] : ''
      )}>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="font-mono text-sm text-muted-foreground">{incident.ticketNumber}</span>
          <StatusBadge status={incident.status} />
          <SeverityBadge severity={incident.severity} />
        </div>
        <h1 className="text-2xl font-bold text-foreground leading-snug mb-3">{incident.title}</h1>
        <p className="text-base text-muted-foreground leading-relaxed">{incident.description}</p>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Timeline */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <Clock className="w-4 h-4 text-muted-foreground/60" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Timeline</p>
          </div>
          <dl className="space-y-3">
            {[
              { dt: 'Created',  dd: formatDistanceToNow(incident.createdAt) },
              { dt: 'Category', dd: incident.category ?? '—' },
              ...(incident.resolvedAt ? [{ dt: 'Resolved', dd: formatDistanceToNow(incident.resolvedAt) }] : []),
            ].map(({ dt, dd }) => (
              <div key={dt} className="flex justify-between">
                <dt className="text-sm text-muted-foreground">{dt}</dt>
                <dd className="text-sm font-semibold capitalize">{dd}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Affected services */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <Server className="w-4 h-4 text-muted-foreground/60" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Affected Services</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {incident.affectedServices.map((svc) => (
              <span key={svc} className="text-sm px-3 py-1.5 rounded-lg bg-surface text-muted-foreground border border-border">
                {svc}
              </span>
            ))}
          </div>
        </div>

        {/* Lifecycle controls (client) */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <User className="w-4 h-4 text-muted-foreground/60" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Lifecycle</p>
          </div>
          <LifecycleControls
            incidentId={incident.id}
            status={incident.status}
            assignee={incident.assignee}
          />
        </div>
      </div>

      {/* Live scenario metrics */}
      {scenario && (
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-6">
            {scenario.icon} Live Metrics at Time of Incident
          </p>
          <div className="grid grid-cols-3 gap-8">
            {scenario.metrics.map((m) => (
              <div key={m.label}>
                <p className="text-sm text-muted-foreground mb-2">{m.label}</p>
                <p className={cn('text-4xl font-bold tabular-nums tracking-tight', m.alert ? 'text-red-400' : 'text-foreground')}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Analysis (client — polls until analysis is ready) */}
      <AnalysisPanel analysis={analysis} incidentId={incident.id} incidentStatus={incident.status} />

      {/* Back link */}
      <Link
        href="/incidents"
        className="self-start flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to incidents
      </Link>
    </div>
  );
}
