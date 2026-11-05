# @tsnx/telemetry

Enterprise Observability, Distributed Tracing, Metrics, and TSNX Studio Integration for TSNX applications.

Supports W3C OpenTelemetry trace propagation, ambient async context via `AsyncLocalStorage` (modeled after .NET `System.Diagnostics.Activity.Current`), Prometheus metrics exposition, and visual live waterfall streaming for **TSNX Studio**.

## Installation

```bash
pnpm add @tsnx/telemetry
```

## Quick Start

```typescript
import { WebApplication, Results } from '@tsnx/web';
import '@tsnx/telemetry';
import { ITracerToken, Activity } from '@tsnx/telemetry';

const builder = WebApplication.createBuilder();

// 1. Single Canonical API convention: builder.services.addTelemetry()
builder.services.addTelemetry((options) => {
  options.serviceName = 'catalog-api';
  options.serviceVersion = '2.2.0';
});

const app = builder.build();

// 2. Enable automatic HTTP server tracing and metrics middleware
app.useTelemetry();

// 3. Expose Prometheus metrics and TSNX Studio endpoints
app.mapMetrics('/metrics'); // Prometheus scraper
app.mapTelemetry('/_tsnx/telemetry'); // TSNX Studio live dashboard

// 4. Trace internal service operations inside route handlers
app.mapGet('/products', async (ctx) => {
  const tracer = ctx.services.get(ITracerToken);

  // Manual instrumentation with ambient parent context
  const data = await tracer.trace('products.fetch', async (span) => {
    span.setAttribute('query.category', 'hardware');
    return await database.findProducts();
  });

  return Results.json(data);
});

await app.run();
```

## Features

- **Ambient Async Context**: Spans automatically bind to the active async execution flow. Child spans inherit `traceId` and `parentSpanId` without passing context objects manually.
- **W3C Distributed Tracing**: Reads and writes standard `traceparent` headers across microservices, and returns `X-Trace-Id` on responses.
- **Prometheus Metrics**: High-performance Counters, Gauges, and Histograms exported in standard Prometheus format.
- **TSNX Studio Ready**: In-memory ring buffer and real-time streaming endpoint for visual developer inspection.

## License

MIT © [TSNX](https://github.com/tsnxjs/tsnx)
