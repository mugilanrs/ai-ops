'use client';

import {
  PieChart, Pie, Cell, Tooltip, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList,
} from 'recharts';

const SEVERITY_COLORS: Record<string, string> = {
  P1: '#ef4444',
  P2: '#f97316',
  P3: '#eab308',
  P4: '#3b82f6',
};

const tooltipStyle = {
  background:   'var(--tooltip-bg)',
  border:       '1px solid var(--tooltip-border)',
  borderRadius: 8,
  fontSize:     13,
  color:        'var(--tooltip-fg)',
  boxShadow:    '0 8px 24px oklch(0 0 0 / 0.25)',
  padding:      '8px 12px',
};

interface DataPoint { name: string; value: number }
interface CategoryPoint { name: string; count: number }

export function SeverityPie({ data }: { data: DataPoint[] }) {
  const filtered = data.filter((d) => d.value > 0);
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Severity Distribution</p>
        <span className="text-sm text-muted-foreground">{total} total</span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">No incidents yet</div>
      ) : (
        <div className="flex items-center gap-8">
          <div className="shrink-0">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={filtered} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value" strokeWidth={0}>
                  {filtered.map((entry) => (
                    <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] ?? '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, 'incidents']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 space-y-4">
            {data.map((d) => (
              <div key={d.name} className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: SEVERITY_COLORS[d.name] ?? '#6b7280' }} />
                <span className="text-sm text-muted-foreground w-8">{d.name}</span>
                <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: total > 0 ? `${(d.value / total) * 100}%` : '0%', background: SEVERITY_COLORS[d.name] ?? '#6b7280' }} />
                </div>
                <span className="text-sm font-semibold tabular-nums w-4 text-right">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function CategoryBar({ data }: { data: CategoryPoint[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-6">
        Incidents by Category
      </p>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">No data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 16, right: 4, bottom: 4, left: -20 }} barSize={24}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--surface-xs)' }} />
            <Bar dataKey="count" fill="#7c5cf6" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="count" position="top" style={{ fontSize: 12, fill: '#6b7280' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
