import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Metric {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: 'danger' | 'warning' | 'ok' | 'neutral';
  trend?: 'up' | 'down' | 'flat';
  trendLabel?: string;
}

const highlightCls: Record<string, string> = {
  danger: 'text-red-400',
  warning: 'text-orange-400',
  ok: 'text-emerald-400',
  neutral: 'text-foreground',
};

const topBar: Record<string, string> = {
  danger: 'bg-red-500/70',
  warning: 'bg-orange-500/70',
  ok: 'bg-emerald-500/60',
  neutral: 'bg-border',
};

const cardBg: Record<string, string> = {
  danger: 'bg-red-500/[0.04]',
  warning: 'bg-orange-500/[0.04]',
  ok: '',
  neutral: '',
};

export function MetricsRow({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m) => {
        const h = m.highlight ?? 'neutral';
        const TrendIcon = m.trend === 'up' ? TrendingUp : m.trend === 'down' ? TrendingDown : Minus;
        const trendColor =
          m.trend === 'up'
            ? h === 'danger' ? 'text-red-400' : 'text-emerald-400'
            : m.trend === 'down'
            ? h === 'ok' ? 'text-emerald-400' : 'text-red-400'
            : 'text-muted-foreground';

        return (
          <div
            key={m.label}
            className={cn(
              'relative rounded-xl border border-border bg-card px-6 py-5 overflow-hidden shadow-card',
              cardBg[h]
            )}
          >
            <div className={cn('absolute top-0 left-0 right-0 h-[3px]', topBar[h])} />

            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              {m.label}
            </p>

            <p className={cn('text-5xl font-bold tabular-nums tracking-tight leading-none', highlightCls[h])}>
              {m.value}
            </p>

            {(m.trend || m.sub) && (
              <div className="mt-4 flex items-center gap-3">
                {m.trend && (
                  <span className={cn('flex items-center gap-1 text-sm font-medium', trendColor)}>
                    <TrendIcon className="w-4 h-4" />
                    {m.trendLabel}
                  </span>
                )}
                {m.sub && !m.trend && (
                  <span className="text-sm text-muted-foreground">{m.sub}</span>
                )}
              </div>
            )}

            {m.sub && m.trend && (
              <p className="text-xs text-muted-foreground/60 mt-1">{m.sub}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
