import { cn } from '@/lib/utils';
import { Severity } from '@/lib/types';

const severityCfg: Record<Severity, { label: string; dot: string; pill: string }> = {
  P1: { label: 'P1 Critical', dot: 'bg-red-500', pill: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/30' },
  P2: { label: 'P2 High',     dot: 'bg-orange-500', pill: 'bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/30' },
  P3: { label: 'P3 Medium',   dot: 'bg-yellow-500', pill: 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/30' },
  P4: { label: 'P4 Low',      dot: 'bg-blue-500',   pill: 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30' },
};

const statusCfg: Record<string, { label: string; dot: string; pill: string }> = {
  open:        { label: 'Open',        dot: 'bg-red-500 animate-pulse',  pill: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/25' },
  in_progress: { label: 'In Progress', dot: 'bg-blue-400 animate-pulse', pill: 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/25' },
  resolved:    { label: 'Resolved',    dot: 'bg-emerald-500',            pill: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/25' },
};

export function SeverityDot({ severity, className }: { severity: Severity | null; className?: string }) {
  if (!severity) return <span className={cn('w-2.5 h-2.5 rounded-full bg-muted-foreground/25 inline-block', className)} />;
  return <span className={cn('w-2.5 h-2.5 rounded-full inline-block', severityCfg[severity].dot, className)} />;
}

export function SeverityBadge({ severity, className }: { severity: Severity | null; className?: string }) {
  if (!severity) {
    return (
      <span className={cn('inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-surface text-muted-foreground ring-1 ring-border', className)}>
        Analyzing…
      </span>
    );
  }
  const { label, dot, pill } = severityCfg[severity];
  return (
    <span className={cn('inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold', pill, className)}>
      <span className={cn('w-2 h-2 rounded-full', dot)} />
      {label}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const cfg = statusCfg[status] ?? { label: status, dot: 'bg-muted-foreground', pill: 'bg-surface text-muted-foreground ring-1 ring-border' };
  return (
    <span className={cn('inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold', cfg.pill, className)}>
      <span className={cn('w-2 h-2 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}
