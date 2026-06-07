'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, BookOpen, Activity, Zap, Circle } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

const nav = [
  {
    section: 'OVERVIEW',
    items: [
      { href: '/',          label: 'Dashboard',    icon: LayoutDashboard },
      { href: '/incidents', label: 'All Incidents', icon: Activity },
    ],
  },
  {
    section: 'CATALOG',
    items: [
      { href: '/catalog', label: 'Scenarios', icon: BookOpen },
    ],
  },
];

const systemStatus = [
  { label: 'API Gateway',      ok: true  },
  { label: 'Database Cluster', ok: true  },
  { label: 'Message Queue',    ok: false },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-60 shrink-0 h-screen sticky top-0 border-r border-border bg-sidebar overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-border shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 ring-1 ring-primary/30">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight text-foreground">AIOps</p>
          <p className="text-xs text-muted-foreground leading-none">Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-6">
        {nav.map(({ section, items }) => (
          <div key={section}>
            <p className="px-3 mb-2 text-[10px] font-semibold tracking-widest text-muted-foreground/40 uppercase">
              {section}
            </p>
            <ul className="space-y-0.5">
              {items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== '/' && pathname.startsWith(href));
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-surface'
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-primary" />
                      )}
                      <Icon className={cn(
                        'w-4 h-4 shrink-0 transition-colors',
                        active ? 'text-primary' : 'text-muted-foreground/60 group-hover:text-muted-foreground'
                      )} />
                      <span className="flex-1">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* System health */}
      <div className="mx-3 mb-3 p-4 rounded-xl bg-surface-sm border border-border">
        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground/40 uppercase mb-3">
          System Health
        </p>
        <ul className="space-y-2.5">
          {systemStatus.map(({ label, ok }) => (
            <li key={label} className="flex items-center gap-2.5">
              <Circle className={cn('w-2 h-2 shrink-0 fill-current', ok ? 'text-emerald-500' : 'text-red-500')} />
              <span className={cn('flex-1 text-xs truncate', ok ? 'text-muted-foreground' : 'text-red-500/80')}>
                {label}
              </span>
              <span className={cn('text-[10px] font-bold', ok ? 'text-emerald-500' : 'text-red-500')}>
                {ok ? 'OK' : 'ALERT'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Theme toggle */}
      <div className="px-4 py-4 border-t border-border flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/40 uppercase">Theme</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
