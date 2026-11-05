# @tsnx/health-checks

Enterprise Health Checks Subsystem for TSNX applications, modeled after ASP.NET Core `Microsoft.AspNetCore.Diagnostics.HealthChecks`.

Supports Liveness & Readiness probes for Kubernetes/Cloud Run, tag-based filtering, custom response writers, built-in checks, and visual reporting for **TSNX Studio**.

## Installation

```bash
pnpm add @tsnx/health-checks
```

## Quick Start

```typescript
import { WebApplication } from '@tsnx/web';
import '@tsnx/health-checks';
import { HealthCheckResult, PingHealthCheck, MemoryHealthCheck } from '@tsnx/health-checks';

const builder = WebApplication.createBuilder();

// 1. Single Canonical API convention: builder.services.addHealthChecks()
builder.services.addHealthChecks((hc) => {
  // Liveness check
  hc.addCheck('ping', new PingHealthCheck(), { tags: ['live'] });

  // Memory usage check
  hc.addCheck('memory', new MemoryHealthCheck({
    maxHeapBytes: 1024 * 1024 * 1024, // 1 GB
  }), { tags: ['live'] });

  // Readiness check (e.g. database / external service)
  hc.addCheck('database', async () => {
    const isConnected = await checkDbConnection();
    return isConnected
      ? HealthCheckResult.healthy('Database connection active')
      : HealthCheckResult.unhealthy('Cannot connect to database');
  }, { tags: ['ready'] });
});

const app = builder.build();

// 2. Map health check endpoints
// Full health report
app.mapHealthChecks('/healthz');

// Kubernetes liveness probe (HTTP 200 if container process is healthy)
app.mapHealthChecks('/healthz/live', {
  predicate: (check) => check.tags.includes('live'),
});

// Kubernetes readiness probe (HTTP 200 if ready to receive traffic)
app.mapHealthChecks('/healthz/ready', {
  predicate: (check) => check.tags.includes('ready'),
});

await app.run();
```

## Status Codes

| HealthStatus | Default HTTP Status | Description |
|---|---|---|
| **`Healthy`** | `200 OK` | All components are functioning normally. |
| **`Degraded`** | `200 OK` | The service is operational but experiencing degraded performance. |
| **`Unhealthy`** | `503 Service Unavailable` | One or more critical dependencies failed. |

## License

MIT © [TSNX](https://github.com/tsnxjs/tsnx)
