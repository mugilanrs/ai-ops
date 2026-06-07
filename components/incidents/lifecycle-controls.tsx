'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateStatusAction, updateAssigneeAction } from '@/lib/actions/incidents';
import type { IncidentStatus } from '@/lib/types';

const TEAM_MEMBERS = ['alice@ops.io', 'bob@ops.io', 'carol@ops.io', 'dave@ops.io', 'eve@ops.io'];

interface Props {
  incidentId: string;
  status:     IncidentStatus;
  assignee:   string | null;
}

export function LifecycleControls({ incidentId, status, assignee }: Props) {
  const router          = useRouter();
  const [pending, start] = useTransition();

  function handleStatus(e: React.ChangeEvent<HTMLSelectElement>) {
    start(async () => {
      await updateStatusAction(incidentId, e.target.value as IncidentStatus);
      router.refresh();
    });
  }

  function handleAssignee(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value === 'unassigned' ? null : e.target.value;
    start(async () => {
      await updateAssigneeAction(incidentId, val);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4" style={{ opacity: pending ? 0.6 : 1 }}>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Status</p>
        <select
          value={status}
          onChange={handleStatus}
          disabled={pending}
          className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Assignee</p>
        <select
          value={assignee ?? 'unassigned'}
          onChange={handleAssignee}
          disabled={pending}
          className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <option value="unassigned">Unassigned</option>
          {TEAM_MEMBERS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
