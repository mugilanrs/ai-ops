'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Brain, CheckCircle2, AlertTriangle, Loader2, FileText, Users, Network, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

type Classification = { category: string; subsystem: string; routingTeam: string };
type Priority       = { severity: string; reasoning: string };
type BusinessImpact = { affectedServices: string[]; impactSummary: string; estUsers: number };
type Similar        = { id: string; score: number; title: string; ticketNumber: string };
type Resolution     = { steps: string[]; rationale: string; runbookRefs: string[] };

export type SerializedAnalysis = {
  classification:   Classification | null | undefined;
  priority:         Priority | null | undefined;
  businessImpact:   BusinessImpact | null | undefined;
  similarIncidents: Similar[] | null | undefined;
  dedupMatch:       Similar | null | undefined;
  resolution:       Resolution | null | undefined;
  commsDraft:       string | null | undefined;
};

interface Props {
  analysis:       SerializedAnalysis | null;
  incidentId:     string;
  incidentStatus?: string;
}

export function AnalysisPanel({ analysis, incidentId, incidentStatus }: Props) {
  const router   = useRouter();
  const pollsRef = useRef(0);

  useEffect(() => {
    if (analysis) return;
    pollsRef.current = 0;
    const timer = setInterval(() => {
      pollsRef.current += 1;
      router.refresh();
      if (pollsRef.current >= 20) clearInterval(timer); // stop after ~60s
    }, 3000);
    return () => clearInterval(timer);
  }, [analysis, router]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 ring-1 ring-primary/20">
          <Brain className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-base font-semibold">AI Analysis Pipeline</p>
          <p className="text-xs text-muted-foreground">LangGraph · llama-3.1-8b + llama-3.3-70b · pgvector</p>
        </div>
        <div className="ml-auto">
          {analysis ? (
            <span className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Complete
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing…
            </span>
          )}
        </div>
      </div>

      {!analysis ? (
        <AnalyzingPlaceholder />
      ) : (
        <AnalysisDisplay analysis={analysis} isResolved={incidentStatus === 'resolved'} />
      )}
    </div>
  );
}

function AnalyzingPlaceholder() {
  const nodes = [
    { label: 'Triage Classification',  desc: 'Category · subsystem · routing team · llama-3.1-8b' },
    { label: 'Priority Assessment',     desc: 'Severity P1–P4 · business impact · llama-3.1-8b' },
    { label: 'Similar Incidents',       desc: 'pgvector cosine search · top-5 nearest neighbours' },
    { label: 'Resolution Steps',        desc: 'Tool-using agent · runbook lookup · llama-3.3-70b' },
  ];
  return (
    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
      {nodes.map(({ label, desc }) => (
        <div key={label} className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-surface-sm border border-border animate-pulse">
          <Loader2 className="w-4 h-4 mt-0.5 text-muted-foreground/30 animate-spin shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground/50">{label}</p>
            <p className="text-xs text-muted-foreground/35 mt-0.5">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalysisDisplay({ analysis, isResolved }: { analysis: SerializedAnalysis; isResolved?: boolean }) {
  const { classification, priority, businessImpact, similarIncidents, dedupMatch, resolution, commsDraft } = analysis;

  return (
    <div className="divide-y divide-border/50">
      {/* Row 1: Classification + Priority */}
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/50">
        <Section icon={<Network className="w-4 h-4" />} title="Triage Classification">
          {classification ? (
            <dl className="space-y-2.5">
              <Row label="Category"     value={classification.category} />
              <Row label="Subsystem"    value={classification.subsystem} />
              <Row label="Routing Team" value={classification.routingTeam} chip />
            </dl>
          ) : <Empty />}
        </Section>

        <Section icon={<Zap className="w-4 h-4" />} title="Priority Assessment">
          {priority ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <SevBadge severity={priority.severity} />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{priority.reasoning}</p>
              {businessImpact && (
                <div className="mt-3 pt-3 border-t border-border/40 space-y-1.5">
                  <p className="text-xs text-muted-foreground/60">{businessImpact.impactSummary}</p>
                  {businessImpact.estUsers > 0 && (
                    <p className="text-xs text-muted-foreground/50 flex items-center gap-1">
                      <Users className="w-3 h-3" /> ~{businessImpact.estUsers.toLocaleString()} users affected
                    </p>
                  )}
                </div>
              )}
            </>
          ) : <Empty />}
        </Section>
      </div>

      {/* Row 2: Similar Incidents */}
      {(similarIncidents?.length ?? 0) > 0 && (
        <Section icon={<FileText className="w-4 h-4" />} title="Similar Past Incidents">
          {dedupMatch && (
            <div className="mb-3 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-orange-500/8 border border-orange-500/20 text-sm">
              <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
              <span className="text-orange-300">
                Possible duplicate of active incident{' '}
                <Link href={`/incidents/${dedupMatch.id}`} className="font-semibold underline underline-offset-2">
                  {dedupMatch.ticketNumber}
                </Link>{' '}
                (similarity {(dedupMatch.score * 100).toFixed(0)}%)
              </span>
            </div>
          )}
          <div className="space-y-2">
            {(similarIncidents ?? []).map((s) => (
              <Link
                key={s.id}
                href={`/incidents/${s.id}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-sm border border-border hover:bg-surface transition-colors group"
              >
                <span className="text-xs font-mono text-muted-foreground/60 shrink-0 w-16">{s.ticketNumber}</span>
                <span className="flex-1 text-sm text-foreground/80 truncate group-hover:text-foreground">{s.title}</span>
                <span className="text-xs text-muted-foreground/40 shrink-0">{(s.score * 100).toFixed(0)}% match</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Row 3: Resolution Steps */}
      {resolution && (
        <Section icon={<CheckCircle2 className="w-4 h-4" />} title="Recommended Resolution">
          <p className="text-sm text-muted-foreground mb-4">{resolution.rationale}</p>
          <ol className="space-y-2.5">
            {resolution.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-none flex items-center justify-center w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold ring-1 ring-primary/20 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-foreground/85 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
          {resolution.runbookRefs.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {resolution.runbookRefs.map((ref) => (
                <span key={ref} className="text-xs px-2.5 py-1 rounded-md bg-surface text-muted-foreground border border-border">
                  📖 {ref}
                </span>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Row 4: Comms Draft / Post-Mortem */}
      {commsDraft && (
        <Section
          icon={<FileText className="w-4 h-4" />}
          title={isResolved ? 'Post-Mortem Draft' : 'Status Page Draft'}
        >
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{commsDraft}</p>
        </Section>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-muted-foreground/50">{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">{title}</p>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, chip }: { label: string; value: string; chip?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      {chip ? (
        <dd className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">{value}</dd>
      ) : (
        <dd className="text-sm font-medium capitalize">{value}</dd>
      )}
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-muted-foreground/40 italic">No data</p>;
}

const sevColors: Record<string, string> = {
  P1: 'bg-red-500/10 text-red-400 ring-red-500/30',
  P2: 'bg-orange-500/10 text-orange-400 ring-orange-500/30',
  P3: 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/30',
  P4: 'bg-blue-500/10 text-blue-400 ring-blue-500/30',
};

function SevBadge({ severity }: { severity: string }) {
  return (
    <span className={cn('text-sm font-bold px-3 py-1 rounded-full ring-1', sevColors[severity] ?? 'bg-surface text-muted-foreground ring-border')}>
      {severity}
    </span>
  );
}
