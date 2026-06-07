'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scenario } from '@/lib/types';
import { createIncidentAction } from '@/lib/actions/incidents';
import { SeverityBadge } from '@/components/severity-badge';
import { Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const severityHover: Record<string, string> = {
  P1: 'hover:border-red-500/40 hover:shadow-[inset_0_0_60px_rgba(239,68,68,0.03)]',
  P2: 'hover:border-orange-500/40 hover:shadow-[inset_0_0_60px_rgba(249,115,22,0.03)]',
  P3: 'hover:border-yellow-500/30 hover:shadow-[inset_0_0_60px_rgba(234,179,8,0.03)]',
  P4: 'hover:border-blue-500/40 hover:shadow-[inset_0_0_60px_rgba(59,130,246,0.03)]',
};

const severityBtn: Record<string, string> = {
  P1: 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border-red-500/25',
  P2: 'bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 border-orange-500/25',
  P3: 'bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25 border-yellow-500/25',
  P4: 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border-blue-500/25',
};

export function ScenarioCard({ scenario }: { scenario: Scenario }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      const incident = await createIncidentAction(scenario.key, scenario.title, scenario.description, scenario.affectedServices, scenario.category);
      router.push(`/incidents/${incident.id}`);
    } catch {
      setLoading(false);
    }
  }

  const sev = scenario.defaultSeverity;

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border border-border bg-card cursor-pointer transition-all duration-200 group overflow-hidden',
        severityHover[sev]
      )}
      onClick={loading ? undefined : handleCreate}
    >
      {/* Card header */}
      <div className="px-5 pt-5 pb-4 border-b border-border/50">
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="text-2xl">{scenario.icon}</span>
          <SeverityBadge severity={sev} />
        </div>
        <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors leading-snug mb-2">
          {scenario.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {scenario.description}
        </p>
      </div>

      {/* Metrics */}
      <div className="px-5 py-4 border-b border-border/50">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50 mb-3">
          Live Metrics
        </p>
        <div className="space-y-2.5">
          {scenario.metrics.map((m) => (
            <div key={m.label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{m.label}</span>
              <span className={cn('text-sm font-bold tabular-nums', m.alert ? 'text-red-400' : 'text-foreground')}>
                {m.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Services */}
      <div className="px-5 py-3 border-b border-border/50">
        <div className="flex flex-wrap gap-1.5">
          {scenario.affectedServices.slice(0, 3).map((svc) => (
            <span key={svc} className="text-xs px-2.5 py-1 rounded-md bg-surface text-muted-foreground border border-border">
              {svc}
            </span>
          ))}
          {scenario.affectedServices.length > 3 && (
            <span className="text-xs px-2.5 py-1 rounded-md bg-surface text-muted-foreground border border-border">
              +{scenario.affectedServices.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="px-5 py-4 mt-auto">
        <button
          disabled={loading}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-semibold transition-all',
            severityBtn[sev]
          )}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
          {loading ? 'Creating…' : 'Create Incident'}
          {!loading && <ArrowRight className="h-4 w-4 ml-auto opacity-40 group-hover:opacity-80 transition-opacity" />}
        </button>
      </div>
    </div>
  );
}
