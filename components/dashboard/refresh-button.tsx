'use client';

import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export function RefreshButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.refresh()}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground border border-border bg-card hover:bg-surface transition-colors"
    >
      <RefreshCw className="w-4 h-4" />
      Refresh
    </button>
  );
}
