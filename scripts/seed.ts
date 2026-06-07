/**
 * Seed script — run with:  npx tsx scripts/seed.ts
 *
 * Inserts:
 *   • 7 runbooks (one per incident category)
 *   • 35 synthetic resolved incidents with embeddings + analysis
 *   • Initialises the ticket counter row
 *
 * Safe to re-run: truncates the tables first.
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../lib/db/schema';
import { embed, incidentText } from '../lib/embeddings';
import { sql } from 'drizzle-orm';

const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

// ── Runbooks ────────────────────────────────────────────────────
const RUNBOOKS = [
  {
    category: 'database',
    title: 'Database Connection Pool Exhaustion',
    steps: [
      'Check active connections: SELECT count(*) FROM pg_stat_activity;',
      'Kill idle connections older than 10 minutes.',
      'Increase max_connections in postgresql.conf or connection pool size in the app.',
      'Deploy pgBouncer if not already in place.',
      'Add connection timeout and retry logic to application code.',
      'Set up pg_stat_statements to identify long-running queries.',
    ],
  },
  {
    category: 'api',
    title: 'API Gateway 5xx Spike Response',
    steps: [
      'Check gateway error logs for the specific error codes (503 vs 504).',
      'Verify upstream service health via /health endpoints.',
      'Check load balancer target group health — remove unhealthy nodes.',
      'Review recent deployments and rollback if correlated.',
      'Scale up backend instances if CPU/memory is saturated.',
      'Enable circuit breaker if downstream calls are cascading.',
    ],
  },
  {
    category: 'infrastructure',
    title: 'Memory Leak / OOM Kill Recovery',
    steps: [
      'Identify the leaking pod/process: kubectl top pods --sort-by=memory',
      'Capture heap dump before restart: kubectl exec <pod> -- jmap -dump:format=b,file=/tmp/heap.hprof 1',
      'Rolling restart to restore service immediately.',
      'Set memory limits and requests in the deployment spec.',
      'Profile heap dump offline to identify the leak source.',
      'Add memory usage alerting at 80% threshold.',
    ],
  },
  {
    category: 'storage',
    title: 'Disk Space Exhaustion Response',
    steps: [
      'Identify top consumers: du -sh /* | sort -rh | head -20',
      'Rotate and compress logs immediately: logrotate -f /etc/logrotate.conf',
      'Delete old log archives older than 7 days.',
      'Increase disk size or attach additional volume.',
      'Configure log retention policy (max size + max age).',
      'Set up disk usage alerting at 75% threshold.',
    ],
  },
  {
    category: 'cache',
    title: 'Cache Stampede (Redis) Mitigation',
    steps: [
      'Enable probabilistic early expiration (PER) to prevent thundering herd.',
      'Implement a mutex/lock per cache key during recomputation.',
      'Use a fallback stale-while-revalidate strategy.',
      'Rate-limit origin requests during cache warm-up.',
      'Pre-warm cache after any planned flush.',
      'Set Redis maxmemory-policy to allkeys-lru.',
    ],
  },
  {
    category: 'messaging',
    title: 'Message Queue Backlog Clearance',
    steps: [
      'Increase consumer group parallelism: add more consumer instances.',
      'Temporarily pause non-critical producer topics.',
      'Check for poison-pill messages and dead-letter them.',
      'Increase fetch.max.bytes and max.poll.records for consumers.',
      'Monitor consumer lag with kafka-consumer-groups --describe.',
      'Set up lag-based autoscaling for the consumer deployment.',
    ],
  },
  {
    category: 'cpu',
    title: 'High CPU Utilization Response',
    steps: [
      'Identify the high-CPU process: top -b -n 1 | head -20',
      'Profile the process: perf record -g -p <PID> sleep 30 && perf report',
      'Check for runaway batch jobs and reschedule off-peak.',
      'Scale horizontally: add nodes to the cluster.',
      'Review and add missing database indexes — N+1 queries are common culprits.',
      'Enable request throttling/rate limiting to shed load.',
    ],
  },
];

// ── Synthetic historical incidents ─────────────────────────────
type SyntheticIncident = {
  scenarioKey: string;
  title: string;
  description: string;
  category: string;
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  affectedServices: string[];
  assignee: string;
  daysAgo: number;
  resolutionHours: number;
  resolution: {
    steps: string[];
    rationale: string;
    runbookRefs: string[];
  };
};

const INCIDENTS: SyntheticIncident[] = [
  // ── DATABASE ────────────────────────────────────────────
  {
    scenarioKey: 'db-connection-timeout',
    title: 'Database Connection Pool Exhausted — checkout-api',
    description: 'Checkout API connection pool hit max (256). All queries queued. Revenue impact: ~$12k/min.',
    category: 'database', severity: 'P1',
    affectedServices: ['checkout-api', 'user-service'],
    assignee: 'alice@ops.io', daysAgo: 45, resolutionHours: 0.8,
    resolution: {
      steps: ['Increased pool size from 256→512', 'Killed 43 idle connections', 'Deployed pgBouncer'],
      rationale: 'Flash sale traffic spike exceeded pool capacity. Long-term fix: pgBouncer.',
      runbookRefs: ['Database Connection Pool Exhaustion'],
    },
  },
  {
    scenarioKey: 'db-connection-timeout',
    title: 'Replica Lag > 30s — user-service read queries failing',
    description: 'Read replica fell 35 seconds behind primary after a bulk import job. Read queries timing out.',
    category: 'database', severity: 'P2',
    affectedServices: ['user-service', 'profile-api'],
    assignee: 'bob@ops.io', daysAgo: 30, resolutionHours: 1.2,
    resolution: {
      steps: ['Terminated bulk import job', 'Waited for replica to catch up', 'Added read-replica lag alert at 5s'],
      rationale: 'Bulk import saturated WAL. Now runs in off-peak window.',
      runbookRefs: ['Database Connection Pool Exhaustion'],
    },
  },
  {
    scenarioKey: 'db-connection-timeout',
    title: 'Deadlock Storm — inventory service',
    description: 'Inventory updates causing deadlock loops. 400+ lock timeout errors per minute.',
    category: 'database', severity: 'P2',
    affectedServices: ['inventory-service', 'order-service'],
    assignee: 'carol@ops.io', daysAgo: 20, resolutionHours: 2.1,
    resolution: {
      steps: ['Identified deadlock pattern in pg_locks', 'Reordered transaction lock acquisition', 'Added SELECT FOR UPDATE SKIP LOCKED'],
      rationale: 'Race condition in concurrent inventory reservation. Fixed transaction ordering.',
      runbookRefs: ['Database Connection Pool Exhaustion'],
    },
  },
  {
    scenarioKey: 'db-connection-timeout',
    title: 'Slow Query Storm — missing index on orders table',
    description: 'New feature shipped without index on orders.customer_id. Full table scans causing 8s query times.',
    category: 'database', severity: 'P3',
    affectedServices: ['order-history', 'reporting-api'],
    assignee: 'dave@ops.io', daysAgo: 12, resolutionHours: 0.4,
    resolution: {
      steps: ['Created index CONCURRENTLY on orders(customer_id)', 'Query time dropped from 8s to 12ms'],
      rationale: 'Missing index. Added pre-deploy query analysis step to CI.',
      runbookRefs: ['Database Connection Pool Exhaustion'],
    },
  },
  {
    scenarioKey: 'db-connection-timeout',
    title: 'Primary DB failover — 90s outage',
    description: 'Primary node OOM-killed by OS. Auto-failover to replica took 90s. Brief write outage.',
    category: 'database', severity: 'P1',
    affectedServices: ['checkout-api', 'order-service', 'user-service'],
    assignee: 'alice@ops.io', daysAgo: 60, resolutionHours: 0.25,
    resolution: {
      steps: ['Auto-failover completed in 90s', 'Updated DNS to new primary', 'Increased primary memory limits'],
      rationale: 'OOM kill on primary. Promoted replica automatically. Increased memory headroom.',
      runbookRefs: ['Database Connection Pool Exhaustion'],
    },
  },

  // ── API GATEWAY ─────────────────────────────────────────
  {
    scenarioKey: 'api-gateway-5xx',
    title: 'API Gateway 503 Spike — bad deploy',
    description: 'New gateway config pushed broke upstream routing. 503 rate hit 65% for 12 minutes.',
    category: 'api', severity: 'P1',
    affectedServices: ['api-gateway', 'payment-service', 'frontend-web'],
    assignee: 'eve@ops.io', daysAgo: 35, resolutionHours: 0.3,
    resolution: {
      steps: ['Rolled back gateway config in 4 minutes', 'Error rate returned to baseline', 'Added config validation step to pipeline'],
      rationale: 'Config validation gap allowed bad routing rule to deploy.',
      runbookRefs: ['API Gateway 5xx Spike Response'],
    },
  },
  {
    scenarioKey: 'api-gateway-5xx',
    title: 'Payment service timeout cascade',
    description: 'Slow payment provider caused gateway timeouts. Cascaded to 504s across all checkout flows.',
    category: 'api', severity: 'P1',
    affectedServices: ['payment-service', 'checkout-api', 'api-gateway'],
    assignee: 'bob@ops.io', daysAgo: 25, resolutionHours: 1.5,
    resolution: {
      steps: ['Enabled circuit breaker for payment service', 'Switched to backup payment provider', 'Reduced timeout from 30s to 5s'],
      rationale: 'No circuit breaker on payment calls. Added fallback provider and aggressive timeout.',
      runbookRefs: ['API Gateway 5xx Spike Response'],
    },
  },
  {
    scenarioKey: 'api-gateway-5xx',
    title: 'Rate limit misconfiguration — legitimate traffic blocked',
    description: 'Rate limit set 10x too low after infra change. Mobile app users getting 429s treated as 503 by gateway.',
    category: 'api', severity: 'P2',
    affectedServices: ['api-gateway', 'mobile-api'],
    assignee: 'carol@ops.io', daysAgo: 18, resolutionHours: 0.2,
    resolution: {
      steps: ['Updated rate limit from 100req/min to 1000req/min', 'Deployed in 8 minutes'],
      rationale: 'Copy-paste error in Terraform config set wrong rate limit value.',
      runbookRefs: ['API Gateway 5xx Spike Response'],
    },
  },
  {
    scenarioKey: 'api-gateway-5xx',
    title: 'SSL certificate expiry — APAC endpoint',
    description: 'SSL cert expired on APAC gateway endpoint. All HTTPS traffic returning 502.',
    category: 'api', severity: 'P1',
    affectedServices: ['api-gateway', 'frontend-web'],
    assignee: 'dave@ops.io', daysAgo: 90, resolutionHours: 0.5,
    resolution: {
      steps: ['Emergency cert renewal via Let\'s Encrypt', 'Deployed new cert', 'Added cert expiry monitoring (30d warning)'],
      rationale: 'No cert expiry alerting. Now automated renewal and 30-day warning alerts.',
      runbookRefs: ['API Gateway 5xx Spike Response'],
    },
  },
  {
    scenarioKey: 'api-gateway-5xx',
    title: 'DDoS mitigation — 50k rps spike',
    description: 'Volumetric DDoS attack. 50k rps from 3 botnets. Gateway buckled under load.',
    category: 'api', severity: 'P1',
    affectedServices: ['api-gateway', 'frontend-web', 'mobile-api'],
    assignee: 'alice@ops.io', daysAgo: 55, resolutionHours: 0.7,
    resolution: {
      steps: ['Enabled Cloudflare Under Attack mode', 'Blocked 3 ASNs at edge', 'Traffic normalized in 40 minutes'],
      rationale: 'Edge firewall rules applied quickly. Added bot score filtering.',
      runbookRefs: ['API Gateway 5xx Spike Response'],
    },
  },

  // ── INFRASTRUCTURE (memory / cpu) ────────────────────────
  {
    scenarioKey: 'memory-leak-oom',
    title: 'Recommendation service OOM — unbounded cache',
    description: 'In-memory product cache grew to 12GB over 6h. Pod OOM-killed repeatedly. 14 restarts.',
    category: 'infrastructure', severity: 'P2',
    affectedServices: ['recommendation-service', 'homepage'],
    assignee: 'bob@ops.io', daysAgo: 22, resolutionHours: 2.5,
    resolution: {
      steps: ['Added LRU eviction with 1GB limit', 'Redeployed service', 'Set memory limit to 2GB in k8s spec'],
      rationale: 'Cache had no size bound. Fixed with LRU + explicit memory limit.',
      runbookRefs: ['Memory Leak / OOM Kill Recovery'],
    },
  },
  {
    scenarioKey: 'memory-leak-oom',
    title: 'Node.js heap leak — event listener not removed',
    description: 'Notification service heap grew 50MB/hour. Root cause: EventEmitter listeners not cleaned up on request end.',
    category: 'infrastructure', severity: 'P3',
    affectedServices: ['notification-service'],
    assignee: 'carol@ops.io', daysAgo: 15, resolutionHours: 4.0,
    resolution: {
      steps: ['Profiled heap with clinic.js', 'Identified EventEmitter leak in request handler', 'Added removeAllListeners() in finally block'],
      rationale: 'Missing cleanup in async request lifecycle. Fixed + added memory regression test.',
      runbookRefs: ['Memory Leak / OOM Kill Recovery'],
    },
  },
  {
    scenarioKey: 'high-cpu',
    title: 'Pricing batch job competing with live traffic',
    description: 'Scheduled batch job consumed 95% CPU on pricing nodes for 25 minutes during peak hours.',
    category: 'infrastructure', severity: 'P2',
    affectedServices: ['pricing-service', 'cart-service'],
    assignee: 'dave@ops.io', daysAgo: 8, resolutionHours: 0.5,
    resolution: {
      steps: ['Killed batch job', 'Rescheduled to 02:00 UTC daily', 'Added CPU limit of 2 cores on batch job pod'],
      rationale: 'No schedule isolation. Batch jobs now run in off-peak window with CPU limits.',
      runbookRefs: ['High CPU Utilization Response'],
    },
  },
  {
    scenarioKey: 'high-cpu',
    title: 'Regex catastrophic backtracking — search API',
    description: 'A new search input validation regex caused catastrophic backtracking. CPU pegged at 100% on all search nodes.',
    category: 'infrastructure', severity: 'P2',
    affectedServices: ['search-api', 'product-catalog'],
    assignee: 'eve@ops.io', daysAgo: 28, resolutionHours: 1.0,
    resolution: {
      steps: ['Identified regex in input validation via flame graph', 'Replaced with linear-time alternative', 'Added ReDoS check to CI pipeline'],
      rationale: 'Catastrophic backtracking regex in user input path. Added ReDoS static analysis.',
      runbookRefs: ['High CPU Utilization Response'],
    },
  },
  {
    scenarioKey: 'high-cpu',
    title: 'Runaway cron job — analytics aggregation',
    description: 'Analytics aggregation cron ran without LIMIT clause over 200M rows. Took down 3 DB replicas.',
    category: 'infrastructure', severity: 'P2',
    affectedServices: ['analytics-service', 'reporting-api'],
    assignee: 'alice@ops.io', daysAgo: 40, resolutionHours: 1.8,
    resolution: {
      steps: ['Killed runaway query', 'Added LIMIT + pagination', 'Set statement_timeout = 60s for analytics DB role'],
      rationale: 'Unbounded query. Added timeout + pagination. Replicas recovered in 15 minutes.',
      runbookRefs: ['High CPU Utilization Response'],
    },
  },

  // ── STORAGE ──────────────────────────────────────────────
  {
    scenarioKey: 'disk-space',
    title: 'Log volume full — observability blind spot',
    description: 'Log aggregation nodes hit 100% disk. Fluentd stopped shipping logs. 3h of logs lost.',
    category: 'storage', severity: 'P2',
    affectedServices: ['log-aggregator', 'alerting', 'metrics-pipeline'],
    assignee: 'bob@ops.io', daysAgo: 50, resolutionHours: 1.0,
    resolution: {
      steps: ['Deleted 14 days of compressed archives', 'Freed 180GB', 'Set logrotate maxsize to 50GB and age to 7 days'],
      rationale: 'Log retention too long + no disk alert. Added 75% disk alert and automated rotation.',
      runbookRefs: ['Disk Space Exhaustion Response'],
    },
  },
  {
    scenarioKey: 'disk-space',
    title: 'Docker overlay2 bloat — CI worker nodes',
    description: 'CI runner nodes at 95% due to accumulated Docker image layers and stopped containers.',
    category: 'storage', severity: 'P3',
    affectedServices: ['ci-runners', 'build-pipeline'],
    assignee: 'carol@ops.io', daysAgo: 14, resolutionHours: 0.5,
    resolution: {
      steps: ['docker system prune -af freed 140GB', 'Added daily docker prune cron', 'Set ImagePullPolicy to IfNotPresent'],
      rationale: 'No image cleanup on CI nodes. Added automated daily prune.',
      runbookRefs: ['Disk Space Exhaustion Response'],
    },
  },
  {
    scenarioKey: 'disk-space',
    title: 'S3 lifecycle policy missing — media bucket cost spike',
    description: 'User-uploaded media bucket grew to 40TB with no lifecycle policy. Cost spike: +$8k/month.',
    category: 'storage', severity: 'P3',
    affectedServices: ['media-service', 'cdn'],
    assignee: 'dave@ops.io', daysAgo: 35, resolutionHours: 0.5,
    resolution: {
      steps: ['Applied S3 lifecycle rule: move to Glacier after 30d, delete after 1 year', 'Added cost anomaly alert at $500/day'],
      rationale: 'Missing lifecycle policy. Applied tiered storage. Estimated $5k/month savings.',
      runbookRefs: ['Disk Space Exhaustion Response'],
    },
  },

  // ── CACHE ────────────────────────────────────────────────
  {
    scenarioKey: 'cache-stampede',
    title: 'Redis FLUSHALL in production — accidental wipe',
    description: 'Engineer ran FLUSHALL on prod Redis instance. Cache hit rate dropped to 0%. DB at 15x normal load.',
    category: 'cache', severity: 'P1',
    affectedServices: ['session-service', 'product-catalog', 'search-api'],
    assignee: 'eve@ops.io', daysAgo: 70, resolutionHours: 2.0,
    resolution: {
      steps: ['Pre-warmed critical cache keys from DB', 'Blocked FLUSHALL command via Redis ACL', 'Added prod Redis access approval gate'],
      rationale: 'No guardrails on destructive Redis commands. ACL now blocks FLUSHALL/FLUSHDB in prod.',
      runbookRefs: ['Cache Stampede (Redis) Mitigation'],
    },
  },
  {
    scenarioKey: 'cache-stampede',
    title: 'Redis cluster failover — 45s cache miss storm',
    description: 'Redis primary failed over. 45 seconds of cache misses caused 8x spike on origin DB.',
    category: 'cache', severity: 'P2',
    affectedServices: ['product-catalog', 'pricing-service'],
    assignee: 'alice@ops.io', daysAgo: 33, resolutionHours: 0.8,
    resolution: {
      steps: ['Failover completed in 45s automatically', 'Implemented stale-while-revalidate to serve stale during failover', 'Added request coalescing for stampede prevention'],
      rationale: 'Cache architecture lacked graceful degradation. Added stale serving during failover window.',
      runbookRefs: ['Cache Stampede (Redis) Mitigation'],
    },
  },
  {
    scenarioKey: 'cache-stampede',
    title: 'Redis maxmemory hit — eviction causing inconsistency',
    description: 'Redis OOM evicted session keys under allkeys-random policy. Users logged out unexpectedly.',
    category: 'cache', severity: 'P2',
    affectedServices: ['session-service', 'auth-service'],
    assignee: 'bob@ops.io', daysAgo: 18, resolutionHours: 1.2,
    resolution: {
      steps: ['Changed eviction policy to volatile-lru (only evict keys with TTL)', 'Increased Redis maxmemory from 8GB to 16GB', 'Separated session cache from general cache cluster'],
      rationale: 'allkeys-random evicted session keys. Changed to volatile-lru + dedicated session cache.',
      runbookRefs: ['Cache Stampede (Redis) Mitigation'],
    },
  },
  {
    scenarioKey: 'cache-stampede',
    title: 'CDN cache poisoning — bad Vary header',
    description: 'Missing Vary: Accept-Encoding header caused CDN to serve gzipped content to clients that don\'t support it.',
    category: 'cache', severity: 'P3',
    affectedServices: ['cdn', 'frontend-web'],
    assignee: 'carol@ops.io', daysAgo: 9, resolutionHours: 0.3,
    resolution: {
      steps: ['Added Vary: Accept-Encoding to all responses', 'Purged CDN cache', 'Added cache header validation to CI'],
      rationale: 'Missing Vary header. Fixed at origin + CDN purge.',
      runbookRefs: ['Cache Stampede (Redis) Mitigation'],
    },
  },

  // ── MESSAGING ────────────────────────────────────────────
  {
    scenarioKey: 'message-queue-backlog',
    title: 'Order fulfillment queue — 200k message backlog',
    description: 'Consumer group under-provisioned during 10x traffic spike. Backlog reached 200k messages. Orders delayed 2h.',
    category: 'messaging', severity: 'P2',
    affectedServices: ['order-fulfillment', 'notification-service', 'inventory'],
    assignee: 'dave@ops.io', daysAgo: 42, resolutionHours: 3.0,
    resolution: {
      steps: ['Scaled consumer group from 3 to 20 replicas', 'Backlog cleared in 2.5h', 'Configured Kafka lag-based autoscaling (KEDA)'],
      rationale: 'Fixed consumer count couldn\'t handle traffic spikes. KEDA now autoscales based on lag.',
      runbookRefs: ['Message Queue Backlog Clearance'],
    },
  },
  {
    scenarioKey: 'message-queue-backlog',
    title: 'Poison pill message — consumer group stuck',
    description: 'Malformed JSON message caused consumer to crash on every poll. Entire partition stuck for 4h.',
    category: 'messaging', severity: 'P2',
    affectedServices: ['email-service', 'notification-service'],
    assignee: 'eve@ops.io', daysAgo: 27, resolutionHours: 0.8,
    resolution: {
      steps: ['Identified bad message offset via kafka-console-consumer', 'Skipped offset with kafka-consumer-groups --reset-offsets', 'Added dead-letter topic for malformed messages'],
      rationale: 'No DLQ. Consumer crashed on bad message. Added DLQ + schema validation at producer.',
      runbookRefs: ['Message Queue Backlog Clearance'],
    },
  },
  {
    scenarioKey: 'message-queue-backlog',
    title: 'Kafka broker disk full — producer blocked',
    description: 'Kafka broker ran out of disk space due to infinite topic retention. Producers began blocking.',
    category: 'messaging', severity: 'P1',
    affectedServices: ['order-service', 'event-bus', 'audit-log'],
    assignee: 'alice@ops.io', daysAgo: 65, resolutionHours: 1.5,
    resolution: {
      steps: ['Set retention.ms to 7 days on all non-audit topics', 'Deleted oldest log segments to free space', 'Expanded broker EBS volume'],
      rationale: 'Infinite retention policy. Set 7-day retention + expanded storage.',
      runbookRefs: ['Message Queue Backlog Clearance'],
    },
  },
  {
    scenarioKey: 'message-queue-backlog',
    title: 'Consumer rebalance storm — high rebalance frequency',
    description: 'Frequent consumer group rebalances (every 20s) due to aggressive health check timeout. Processing interrupted constantly.',
    category: 'messaging', severity: 'P3',
    affectedServices: ['analytics-consumer', 'metrics-pipeline'],
    assignee: 'bob@ops.io', daysAgo: 11, resolutionHours: 0.4,
    resolution: {
      steps: ['Increased session.timeout.ms from 10s to 45s', 'Increased heartbeat.interval.ms to 15s', 'Switched to static group membership (group.instance.id)'],
      rationale: 'Health check timeout too aggressive. Tuned Kafka consumer timeouts + static membership.',
      runbookRefs: ['Message Queue Backlog Clearance'],
    },
  },

  // ── EXTRA VARIETY ────────────────────────────────────────
  {
    scenarioKey: 'api-gateway-5xx',
    title: 'gRPC health check misconfiguration — false positives',
    description: 'Load balancer health checks used HTTP but service spoke gRPC. All instances flagged unhealthy. 100% traffic black-holed.',
    category: 'api', severity: 'P1',
    affectedServices: ['recommendation-grpc', 'api-gateway'],
    assignee: 'carol@ops.io', daysAgo: 52, resolutionHours: 0.4,
    resolution: {
      steps: ['Updated health check protocol from HTTP to gRPC', 'Instances marked healthy immediately', 'Added protocol validation to deployment checklist'],
      rationale: 'Protocol mismatch on health check. Corrected + added checklist item.',
      runbookRefs: ['API Gateway 5xx Spike Response'],
    },
  },
  {
    scenarioKey: 'memory-leak-oom',
    title: 'Go goroutine leak — websocket handler',
    description: 'WebSocket server accumulated 500k goroutines over 3 days. Eventually OOM-killed.',
    category: 'infrastructure', severity: 'P2',
    affectedServices: ['realtime-service', 'dashboard-ws'],
    assignee: 'dave@ops.io', daysAgo: 38, resolutionHours: 5.0,
    resolution: {
      steps: ['Captured pprof goroutine dump', 'Found goroutine leak in disconnect handler', 'Added context cancellation on WebSocket close', 'Added goroutine count metric alert at 10k'],
      rationale: 'Context not cancelled on disconnect. Fixed + added goroutine leak detection.',
      runbookRefs: ['Memory Leak / OOM Kill Recovery'],
    },
  },
  {
    scenarioKey: 'db-connection-timeout',
    title: 'Connection string leak — wrong env variable',
    description: 'Staging DB connection string deployed to production. Queries hitting wrong DB. Data written to staging for 18 minutes.',
    category: 'database', severity: 'P1',
    affectedServices: ['order-service', 'user-service'],
    assignee: 'eve@ops.io', daysAgo: 80, resolutionHours: 0.5,
    resolution: {
      steps: ['Reverted deployment immediately', 'Replayed 18 minutes of missed writes from event log', 'Added env validation step that confirms DB name matches environment'],
      rationale: 'Env var substitution error. Added build-time DB name validation.',
      runbookRefs: ['Database Connection Pool Exhaustion'],
    },
  },
  {
    scenarioKey: 'disk-space',
    title: 'Core dump accumulation — 80GB overnight',
    description: 'Application crash loop generated 80GB of core dumps overnight, filling the pod ephemeral storage.',
    category: 'storage', severity: 'P3',
    affectedServices: ['data-processor'],
    assignee: 'alice@ops.io', daysAgo: 6, resolutionHours: 0.6,
    resolution: {
      steps: ['Deleted core dumps, freed 80GB', 'Set ulimit -c 0 to disable core dumps in production', 'Fixed the underlying crash (nil pointer dereference)'],
      rationale: 'Core dumps enabled in prod. Disabled + fixed the crashing bug.',
      runbookRefs: ['Disk Space Exhaustion Response'],
    },
  },
  {
    scenarioKey: 'high-cpu',
    title: 'N+1 query — product listing page',
    description: 'New product listing page made one DB query per product for pricing data. 150 products = 150 queries. Page load 12s.',
    category: 'infrastructure', severity: 'P3',
    affectedServices: ['product-catalog', 'pricing-service'],
    assignee: 'bob@ops.io', daysAgo: 5, resolutionHours: 2.0,
    resolution: {
      steps: ['Identified N+1 with query logging (log_min_duration_statement=100)', 'Rewrote to single JOIN query', 'Page load dropped from 12s to 180ms'],
      rationale: 'Classic N+1. Fixed with JOIN + added GraphQL DataLoader for future requests.',
      runbookRefs: ['High CPU Utilization Response'],
    },
  },
];

// ── Helpers ────────────────────────────────────────────────────
function daysAgoDate(days: number, plusHours = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() + plusHours);
  return d;
}

let ticketN = 1000;
function nextTicket() { return `INC-${++ticketN}`; }

// ── Main ───────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Starting seed...\n');

  // Truncate existing data
  console.log('Truncating existing data...');
  await db.execute(sql`TRUNCATE incident_analysis, incidents, runbooks, ticket_counter CASCADE`);
  console.log('✓ Truncated\n');

  // Seed ticket counter
  await db.insert(schema.ticketCounter).values({ id: 1, current: 1041 });
  console.log('✓ Ticket counter initialised at INC-1041\n');

  // Seed runbooks
  console.log('Seeding runbooks...');
  await db.insert(schema.runbooks).values(RUNBOOKS.map(r => ({ category: r.category, title: r.title, steps: r.steps })));
  console.log(`✓ ${RUNBOOKS.length} runbooks inserted\n`);

  // Seed incidents with embeddings
  console.log('Seeding incidents (this generates embeddings — first run downloads ~25MB model)...\n');

  for (let i = 0; i < INCIDENTS.length; i++) {
    const inc = INCIDENTS[i];
    const ticket = nextTicket();
    const createdAt = daysAgoDate(inc.daysAgo);
    const resolvedAt = new Date(createdAt.getTime() + inc.resolutionHours * 3600 * 1000);

    process.stdout.write(`  [${i + 1}/${INCIDENTS.length}] ${ticket} ${inc.title.slice(0, 50)}...`);

    // Generate embedding
    const vector = await embed(incidentText(inc.title, inc.description));

    // Insert incident
    const [inserted] = await db.insert(schema.incidents).values({
      ticketNumber: ticket,
      scenarioKey: inc.scenarioKey,
      title: inc.title,
      description: inc.description,
      status: 'resolved',
      severity: inc.severity,
      category: inc.category,
      assignee: inc.assignee,
      affectedServices: inc.affectedServices,
      embedding: vector,
      createdAt,
      resolvedAt,
    }).returning();

    // Insert analysis
    await db.insert(schema.incidentAnalysis).values({
      incidentId: inserted.id,
      classification: {
        category: inc.category,
        subsystem: inc.affectedServices[0],
        routingTeam: inc.assignee.split('@')[0],
      },
      priority: { severity: inc.severity, reasoning: `Historical: ${inc.severity} severity confirmed post-resolution.` },
      businessImpact: {
        affectedServices: inc.affectedServices,
        impactSummary: inc.description.slice(0, 120),
        estUsers: inc.severity === 'P1' ? 50000 : inc.severity === 'P2' ? 10000 : 1000,
      },
      similarIncidents: [],
      dedupMatch: null,
      resolution: inc.resolution,
      commsDraft: inc.severity === 'P1' ? `INCIDENT UPDATE: ${inc.title}. Our team identified and resolved the issue. Full postmortem to follow within 48h.` : null,
      createdAt,
    });

    console.log(' ✓');
  }

  console.log(`\n✅ Seed complete!`);
  console.log(`   ${INCIDENTS.length} incidents inserted`);
  console.log(`   ${RUNBOOKS.length} runbooks inserted`);
  console.log('\nRun a quick sanity check:');
  console.log('  npx tsx scripts/verify-embeddings.ts\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
