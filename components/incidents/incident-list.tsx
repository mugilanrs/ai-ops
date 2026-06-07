'use client';

import Link from 'next/link';
import { Incident } from '@/lib/types';
import { SeverityBadge, StatusBadge, SeverityDot } from '@/components/severity-badge';
import { formatDistanceToNow } from '@/lib/time';

const severityOrder: Record<string, number> = { P1: 0, P2: 1, P3: 2, P4: 3 };

export function IncidentList({ incidents }: { incidents: Incident[] }) {
  if (incidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-border">
        <p className="text-base text-muted-foreground">No incidents found.</p>
        <Link href="/catalog" className="text-sm text-primary hover:underline mt-2">
          Open the catalog to create one →
        </Link>
      </div>
    );
  }

  const sorted = [...incidents].sort((a, b) => {
    const so = (severityOrder[a.severity ?? 'P4'] ?? 3) - (severityOrder[b.severity ?? 'P4'] ?? 3);
    return so !== 0 ? so : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[28px_100px_1fr_180px_130px_120px_80px] gap-4 px-6 py-3 border-b border-border bg-surface-xs">
        {['', 'TICKET', 'TITLE', 'SERVICES', 'SEVERITY', 'STATUS', 'AGE'].map((h) => (
          <span key={h} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">{h}</span>
        ))}
      </div>

      <ul>
        {sorted.map((inc, i) => (
          <li key={inc.id} className={i > 0 ? 'border-t border-border/40' : ''}>
            <Link
              href={`/incidents/${inc.id}`}
              className="grid grid-cols-[28px_100px_1fr_180px_130px_120px_80px] gap-4 px-6 py-4 items-center hover:bg-surface-sm transition-colors group"
            >
              <SeverityDot severity={inc.severity} className="w-2.5 h-2.5" />

              <span className="font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                {inc.ticketNumber}
              </span>

              <span className="text-sm font-medium text-foreground/90 truncate group-hover:text-primary transition-colors">
                {inc.title}
              </span>

              <div className="flex gap-1.5 flex-wrap">
                {inc.affectedServices.slice(0, 2).map((s) => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded bg-surface text-muted-foreground border border-border truncate max-w-[80px]">
                    {s}
                  </span>
                ))}
                {inc.affectedServices.length > 2 && (
                  <span className="text-xs px-2 py-0.5 rounded bg-surface text-muted-foreground border border-border">
                    +{inc.affectedServices.length - 2}
                  </span>
                )}
              </div>

              <SeverityBadge severity={inc.severity} />
              <StatusBadge status={inc.status} />

              <span className="text-sm text-muted-foreground/60 tabular-nums">{formatDistanceToNow(inc.createdAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
