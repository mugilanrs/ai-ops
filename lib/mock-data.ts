import { Incident } from './types';

export const MOCK_HISTORICAL_INCIDENTS: Incident[] = [
  {
    id: 'mock-001',
    ticketNumber: 'INC-1021',
    scenarioKey: 'db-connection-timeout',
    title: 'Database Connection Timeout — checkout cluster',
    description: 'Primary DB connection pool exhausted during flash sale.',
    status: 'resolved',
    severity: 'P1',
    category: 'database',
    assignee: 'alice@ops.io',
    affectedServices: ['checkout-api', 'user-service'],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 52 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-002',
    ticketNumber: 'INC-1022',
    scenarioKey: 'api-gateway-5xx',
    title: 'API Gateway 5xx Spike — APAC region',
    description: 'Gateway returning 503 errors after config push.',
    status: 'resolved',
    severity: 'P1',
    category: 'api',
    assignee: 'bob@ops.io',
    affectedServices: ['api-gateway', 'payment-service'],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 28 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-003',
    ticketNumber: 'INC-1023',
    scenarioKey: 'memory-leak-oom',
    title: 'Memory Leak — recommendation-service',
    description: 'OOM kills after unbounded cache growth.',
    status: 'resolved',
    severity: 'P2',
    category: 'infrastructure',
    assignee: 'carol@ops.io',
    affectedServices: ['recommendation-service'],
    createdAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000 + 95 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-004',
    ticketNumber: 'INC-1024',
    scenarioKey: 'high-cpu',
    title: 'High CPU — pricing batch job conflict',
    description: 'Batch pricing job competing with live traffic.',
    status: 'in_progress',
    severity: 'P2',
    category: 'infrastructure',
    assignee: 'alice@ops.io',
    affectedServices: ['pricing-service', 'cart-service'],
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    resolvedAt: null,
  },
  {
    id: 'mock-005',
    ticketNumber: 'INC-1025',
    scenarioKey: 'cache-stampede',
    title: 'Cache Stampede — product catalog Redis',
    description: 'Redis flush caused thundering herd on origin DB.',
    status: 'in_progress',
    severity: 'P2',
    category: 'cache',
    assignee: 'dave@ops.io',
    affectedServices: ['product-catalog', 'search-api'],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    resolvedAt: null,
  },
  {
    id: 'mock-006',
    ticketNumber: 'INC-1026',
    scenarioKey: 'disk-space',
    title: 'Disk Space Exhaustion — log nodes',
    description: 'Log aggregator nodes approaching 91% capacity.',
    status: 'open',
    severity: 'P2',
    category: 'storage',
    assignee: null,
    affectedServices: ['log-aggregator', 'metrics-pipeline'],
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    resolvedAt: null,
  },
  {
    id: 'mock-007',
    ticketNumber: 'INC-1027',
    scenarioKey: 'message-queue-backlog',
    title: 'Queue Backlog — order-fulfillment consumer',
    description: 'Order processing queue 98k messages deep.',
    status: 'open',
    severity: 'P3',
    category: 'messaging',
    assignee: null,
    affectedServices: ['order-fulfillment', 'notification-service'],
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    resolvedAt: null,
  },
];

export const MOCK_TEAM_MEMBERS = [
  'alice@ops.io',
  'bob@ops.io',
  'carol@ops.io',
  'dave@ops.io',
  'eve@ops.io',
];

export function computeMetrics(incidents: Incident[]) {
  const active = incidents.filter((i) => i.status !== 'resolved');
  const p1Active = active.filter((i) => i.severity === 'P1').length;
  const resolved = incidents.filter((i) => i.resolvedAt);

  const mttrMs =
    resolved.length > 0
      ? resolved.reduce((sum, i) => {
          const diff = new Date(i.resolvedAt!).getTime() - new Date(i.createdAt).getTime();
          return sum + diff;
        }, 0) / resolved.length
      : 0;

  const mttrMin = Math.round(mttrMs / 60000);

  const severityDist = ['P1', 'P2', 'P3', 'P4'].map((sev) => ({
    name: sev,
    value: incidents.filter((i) => i.severity === sev).length,
  }));

  const categoryDist = Array.from(
    incidents
      .filter((i) => i.category)
      .reduce((map, i) => {
        map.set(i.category!, (map.get(i.category!) ?? 0) + 1);
        return map;
      }, new Map<string, number>())
      .entries()
  ).map(([name, count]) => ({ name, count }));

  return {
    totalActive: active.length,
    p1Active,
    mttrMin,
    resolvedCount: resolved.length,
    severityDist,
    categoryDist,
  };
}
