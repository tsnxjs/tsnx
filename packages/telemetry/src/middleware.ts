// SPDX-License-Identifier: MIT

import { HttpContext, Middleware, RequestDelegate } from '@tsnx/web';
import { Tracer } from './tracer.js';
import { MetricsRegistry } from './metrics.js';
import { Activity, formatTraceparent, parseTraceparent } from './context.js';

export function createTelemetryMiddleware(
  tracer: Tracer,
  metrics: MetricsRegistry,
): Middleware {
  const requestsTotal = metrics.createCounter(
    'http_requests_total',
    'Total count of HTTP requests processed',
  );

  const activeRequests = metrics.createGauge(
    'http_active_requests',
    'Current number of actively executing HTTP requests',
  );

  const requestDuration = metrics.createHistogram(
    'http_request_duration_ms',
    'Execution duration of HTTP requests in milliseconds',
    [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  );

  return async function telemetryMiddleware(
    ctx: HttpContext,
    next: RequestDelegate,
  ): Promise<void> {
    const start = performance.now();
    const method = ctx.request.method;
    const path = ctx.request.path;

    // Distributed tracing: parse incoming W3C traceparent header if provided
    const rawTraceparent = ctx.request.headers.traceparent;
    const incomingTraceparent = Array.isArray(rawTraceparent)
      ? rawTraceparent[0]
      : rawTraceparent;

    const parentContext = parseTraceparent(incomingTraceparent);

    const spanName = `HTTP ${method} ${path}`;
    const span = tracer.startSpan(spanName, {
      kind: 'Server',
      parentContext,
      attributes: {
        'http.request.method': method,
        'url.path': path,
        'client.address': ctx.request.clientIp,
        'user_agent.original': ctx.request.headers['user-agent'],
      },
    });

    // Provide trace headers downstream
    ctx.response.setHeader('X-Trace-Id', span.context.traceId);
    ctx.response.setHeader('traceparent', formatTraceparent(span.context));

    activeRequests.inc(1, { method });

    await Activity.run(span, async () => {
      try {
        await next(ctx);

        const statusCode = ctx.response.statusCode ?? 200;
        span.setAttribute('http.response.status_code', statusCode);

        if (statusCode >= 500) {
          span.setStatus('ERROR', `HTTP ${statusCode}`);
        } else {
          span.setStatus('OK');
        }

        const durationMs = Math.round((performance.now() - start) * 100) / 100;
        const labels = {
          method,
          status: String(statusCode),
          path,
        };

        requestsTotal.inc(1, labels);
        requestDuration.record(durationMs, labels);
      } catch (error) {
        span.recordError(error);
        span.setStatus('ERROR', error instanceof Error ? error.message : String(error));

        const durationMs = Math.round((performance.now() - start) * 100) / 100;
        const labels = {
          method,
          status: '500',
          path,
        };

        requestsTotal.inc(1, labels);
        requestDuration.record(durationMs, labels);
        throw error;
      } finally {
        activeRequests.dec(1, { method });
        span.end();
      }
    });
  };
}
