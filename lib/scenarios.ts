import { Scenario } from './types';

export const scenarios: Scenario[] = [
  {
    key: 'db-connection-timeout',
    title: 'Database Connection Timeout',
    description:
      'Primary database is rejecting new connections. Connection pool exhausted — active connections: 512/512. Queries timing out after 30s. Checkout, order history, and user profile services are degraded.',
    category: 'database',
    affectedServices: ['checkout-api', 'user-service', 'order-history'],
    defaultSeverity: 'P1',
    icon: '🗄️',
    tags: ['database', 'connectivity', 'P1'],
    metrics: [
      { label: 'Active Connections', value: '512 / 512', alert: true },
      { label: 'Query Timeout Rate', value: '94%', alert: true },
      { label: 'Affected Services', value: '3', alert: true },
    ],
  },
  {
    key: 'api-gateway-5xx',
    title: 'API Gateway 5xx Spike',
    description:
      'API gateway returning 503/504 errors at elevated rate. Error rate jumped from 0.1% to 38% in the last 5 minutes. Load balancer health checks failing on 2 of 4 backend nodes.',
    category: 'api',
    affectedServices: ['api-gateway', 'payment-service', 'frontend-web'],
    defaultSeverity: 'P1',
    icon: '🌐',
    tags: ['api', 'gateway', '5xx', 'P1'],
    metrics: [
      { label: 'Error Rate', value: '38%', alert: true },
      { label: 'Healthy Nodes', value: '2 / 4', alert: true },
      { label: 'P99 Latency', value: '12.4s', alert: true },
    ],
  },
  {
    key: 'memory-leak-oom',
    title: 'Memory Leak / OOM Kill',
    description:
      'Recommendation service pods are being OOM-killed repeatedly. Memory usage climbing from 2GB to 8GB over ~2h before crash. Pod restart count: 14 in the last hour. Root cause suspected: unbounded in-memory cache.',
    category: 'infrastructure',
    affectedServices: ['recommendation-service', 'homepage'],
    defaultSeverity: 'P2',
    icon: '💾',
    tags: ['memory', 'oom', 'kubernetes', 'P2'],
    metrics: [
      { label: 'Memory Usage', value: '7.8 GB / 8 GB', alert: true },
      { label: 'Pod Restarts (1h)', value: '14', alert: true },
      { label: 'Cache Size', value: '6.1 GB', alert: true },
    ],
  },
  {
    key: 'high-cpu',
    title: 'High CPU Utilization',
    description:
      'Pricing service nodes sustaining 95%+ CPU for over 20 minutes. Scheduled batch job appears to be competing with live traffic. Auto-scaling triggered but not keeping pace with load.',
    category: 'infrastructure',
    affectedServices: ['pricing-service', 'cart-service'],
    defaultSeverity: 'P2',
    icon: '⚡',
    tags: ['cpu', 'performance', 'autoscaling', 'P2'],
    metrics: [
      { label: 'CPU Usage', value: '97%', alert: true },
      { label: 'Scale Events (1h)', value: '8', alert: true },
      { label: 'Response Degradation', value: '+340ms', alert: true },
    ],
  },
  {
    key: 'disk-space',
    title: 'Disk Space Exhaustion',
    description:
      'Log aggregation nodes at 91% disk capacity. At current write rate (~2 GB/h), full disk expected within 90 minutes. Log ingestion pipeline will halt, causing blind spots in observability.',
    category: 'storage',
    affectedServices: ['log-aggregator', 'metrics-pipeline', 'alerting'],
    defaultSeverity: 'P2',
    icon: '💿',
    tags: ['disk', 'storage', 'logs', 'P2'],
    metrics: [
      { label: 'Disk Used', value: '91%', alert: true },
      { label: 'Write Rate', value: '2.1 GB/h', alert: false },
      { label: 'Time to Full', value: '~85 min', alert: true },
    ],
  },
  {
    key: 'cache-stampede',
    title: 'Cache Stampede (Redis Latency)',
    description:
      'Redis cluster P99 latency spiked to 850ms after a cache flush. Thundering herd of requests hitting the origin database simultaneously. Cache hit rate dropped from 94% to 12%, causing 6x DB query increase.',
    category: 'cache',
    affectedServices: ['session-service', 'product-catalog', 'search-api'],
    defaultSeverity: 'P2',
    icon: '🔴',
    tags: ['redis', 'cache', 'latency', 'P2'],
    metrics: [
      { label: 'Redis P99 Latency', value: '850ms', alert: true },
      { label: 'Cache Hit Rate', value: '12%', alert: true },
      { label: 'DB Load Increase', value: '6×', alert: true },
    ],
  },
  {
    key: 'message-queue-backlog',
    title: 'Message Queue Backlog',
    description:
      'Order processing queue backlog growing at 3,200 messages/min, currently 98k messages deep. Consumer group "order-fulfillment" is under-provisioned. Orders placed > 45 min ago not yet confirmed.',
    category: 'messaging',
    affectedServices: ['order-fulfillment', 'notification-service', 'inventory'],
    defaultSeverity: 'P3',
    icon: '📨',
    tags: ['kafka', 'queue', 'backlog', 'P3'],
    metrics: [
      { label: 'Queue Depth', value: '98,412', alert: true },
      { label: 'Lag Growth Rate', value: '3,200 msg/min', alert: true },
      { label: 'Order Delay', value: '45+ min', alert: true },
    ],
  },
];

export function getScenario(key: string): Scenario | undefined {
  return scenarios.find((s) => s.key === key);
}
