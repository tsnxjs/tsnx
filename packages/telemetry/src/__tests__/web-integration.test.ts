// SPDX-License-Identifier: MIT

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WebApplication, Results } from '@tsnx/web';
import { WebApplicationFactory } from '@tsnx/testing';
import '../index.js';
import { ITracerToken } from '../builder.js';

describe('@tsnx/telemetry: WebApplication End-to-End Integration', () => {
  function createApp(): WebApplication {
    const builder = WebApplication.createBuilder();

    // Single Canonical Registration: builder.services.addTelemetry()
    builder.services.addTelemetry((options) => {
      options.serviceName = 'payment-service';
      options.serviceVersion = '2.2.0';
    });

    const app = builder.build();

    // Enable telemetry middleware
    app.useTelemetry();

    // Expose Prometheus and Studio endpoints
    app.mapMetrics('/metrics');
    app.mapTelemetry('/_tsnx/telemetry');

    app.mapGet('/api/products', async (ctx) => {
      // Resolve ITracer via standard DI token
      const tracer = ctx.services.get(ITracerToken);

      return await tracer.trace('products.query', async (span) => {
        span.setAttribute('page.size', 20);
        return Results.json([{ id: 'p1', name: 'Laptop' }]);
      });
    });

    app.mapGet('/api/error', () => {
      throw new Error('Internal unhandled failure');
    });

    return app;
  }

  it('attaches X-Trace-Id response header and generates server and child spans', async () => {
    const factory = new WebApplicationFactory(createApp);

    try {
      const client = await factory.createClient();
      const res = await client.get('/api/products');

      assert.strictEqual(res.status, 200);

      // Verify trace header was attached
      const traceId = res.headers.get('x-trace-id');
      assert.ok(traceId);
      assert.strictEqual(traceId.length, 32);

      const traceparent = res.headers.get('traceparent');
      assert.ok(traceparent);
      assert.strictEqual(traceparent.includes(traceId), true);

      const json = await res.json();
      assert.deepStrictEqual(json, [{ id: 'p1', name: 'Laptop' }]);
    } finally {
      await factory.dispose();
    }
  });

  it('supports distributed tracing by propagating incoming traceparent header', async () => {
    const factory = new WebApplicationFactory(createApp);

    try {
      const client = await factory.createClient();
      const incomingTraceId = '4bf92f3577b34da6a3ce929d0e0e4736';
      const incomingParentSpanId = '00f067aa0ba902b7';
      const incomingTraceparent = `00-${incomingTraceId}-${incomingParentSpanId}-01`;

      const res = await client.get('/api/products', {
        headers: {
          traceparent: incomingTraceparent,
        },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('x-trace-id'), incomingTraceId);
    } finally {
      await factory.dispose();
    }
  });

  it('exposes /metrics in standard Prometheus format', async () => {
    const factory = new WebApplicationFactory(createApp);

    try {
      const client = await factory.createClient();

      // Trigger a request first so metrics are populated
      await client.get('/api/products');

      const res = await client.get('/metrics');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(
        res.headers.get('content-type'),
        'text/plain; version=0.0.4; charset=utf-8',
      );

      const text = await res.text();
      assert.match(text, /# HELP http_requests_total/);
      assert.match(text, /http_requests_total\{/);
    } finally {
      await factory.dispose();
    }
  });

  it('exposes /_tsnx/telemetry JSON endpoint for TSNX Studio visual dashboard', async () => {
    const factory = new WebApplicationFactory(createApp);

    try {
      const client = await factory.createClient();

      // Make a request to populate traces
      await client.get('/api/products');

      const res = await client.get('/_tsnx/telemetry');
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.service, 'payment-service');
      assert.strictEqual(json.version, '2.2.0');
      assert.ok(Array.isArray(json.traces));
      assert.ok(json.traces.length >= 2); // Server span + child products.query span

      const childSpan = json.traces.find((s: any) => s.name === 'products.query');
      assert.ok(childSpan);
      assert.strictEqual(childSpan.attributes['page.size'], 20);
    } finally {
      await factory.dispose();
    }
  });

  it('throws helpful diagnostic error if app.addTelemetry() is called on app instance', () => {
    const builder = WebApplication.createBuilder();
    const app = builder.build();

    assert.throws(
      () => {
        (app as any).addTelemetry();
      },
      /Cannot call app\.addTelemetry\(\) after builder\.build\(\)/,
    );
  });
});
