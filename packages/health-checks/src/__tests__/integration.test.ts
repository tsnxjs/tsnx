// SPDX-License-Identifier: MIT

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WebApplication } from '@tsnx/web';
import { WebApplicationFactory } from '@tsnx/testing';
import {
  HealthCheckResult,
  PingHealthCheck,
} from '../index.js';

describe('@tsnx/health-checks: WebApplication End-to-End Integration', () => {
  function createHealthyApp(): WebApplication {
    const builder = WebApplication.createBuilder();

    // Canonical API: builder.services.addHealthChecks(...)
    builder.services.addHealthChecks((hc) => {
      hc.addCheck('ping', new PingHealthCheck(), { tags: ['live'] });
      hc.addCheck('db', () => HealthCheckResult.healthy('DB connected'), {
        tags: ['ready'],
      });
    });

    const app = builder.build();

    // Map health check routes
    app.mapHealthChecks('/healthz');
    app.mapHealthChecks('/healthz/live', {
      predicate: (c) => c.tags.includes('live'),
    });
    app.mapHealthChecks('/healthz/ready', {
      predicate: (c) => c.tags.includes('ready'),
    });

    return app;
  }

  function createUnhealthyApp(): WebApplication {
    const builder = WebApplication.createBuilder();

    builder.services.addHealthChecks((hc) => {
      hc.addCheck('ping', new PingHealthCheck(), { tags: ['live'] });
      hc.addCheck(
        'payment_gateway',
        () => HealthCheckResult.unhealthy('Payment gateway gateway timeout (504)'),
        { tags: ['ready'] },
      );
    });

    const app = builder.build();

    app.mapHealthChecks('/healthz');
    app.mapHealthChecks('/healthz/live', {
      predicate: (c) => c.tags.includes('live'),
    });
    app.mapHealthChecks('/healthz/ready', {
      predicate: (c) => c.tags.includes('ready'),
    });

    return app;
  }

  function createCustomWriterApp(): WebApplication {
    const builder = WebApplication.createBuilder();

    builder.services.addHealthChecks((hc) => {
      hc.addCheck('system', () => HealthCheckResult.healthy('all systems operational'));
    });

    const app = builder.build();

    app.mapHealthChecks('/healthz/plain', {
      responseWriter: async (ctx, report) => {
        await ctx.response.writeText(`STATUS:${report.status}`, 200);
      },
    });

    return app;
  }

  it('returns 200 OK and Healthy report when all components pass', async () => {
    const factory = new WebApplicationFactory(createHealthyApp);

    try {
      const client = await factory.createClient();
      const res = await client.get('/healthz');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(
        res.headers.get('content-type'),
        'application/json; charset=utf-8',
      );
      assert.strictEqual(
        res.headers.get('cache-control'),
        'no-store, no-cache, must-revalidate',
      );

      const json = await res.json();
      assert.strictEqual(json.status, 'Healthy');
      assert.strictEqual(json.entries['ping'].status, 'Healthy');
      assert.strictEqual(json.entries['db'].status, 'Healthy');
    } finally {
      await factory.dispose();
    }
  });

  it('returns 503 Service Unavailable when any critical component is Unhealthy', async () => {
    const factory = new WebApplicationFactory(createUnhealthyApp);

    try {
      const client = await factory.createClient();
      const res = await client.get('/healthz');

      assert.strictEqual(res.status, 503);
      const json = await res.json();
      assert.strictEqual(json.status, 'Unhealthy');
      assert.strictEqual(json.entries['payment_gateway'].status, 'Unhealthy');
    } finally {
      await factory.dispose();
    }
  });

  it('correctly filters liveness probe (200) vs readiness probe (503)', async () => {
    const factory = new WebApplicationFactory(createUnhealthyApp);

    try {
      const client = await factory.createClient();

      // Liveness probe (/healthz/live) only checks 'live' tag -> Ping is healthy -> 200
      const liveRes = await client.get('/healthz/live');
      assert.strictEqual(liveRes.status, 200);
      const liveJson = await liveRes.json();
      assert.strictEqual(liveJson.status, 'Healthy');
      assert.ok(liveJson.entries['ping']);
      assert.strictEqual(liveJson.entries['payment_gateway'], undefined);

      // Readiness probe (/healthz/ready) checks 'ready' tag -> Payment is unhealthy -> 503
      const readyRes = await client.get('/healthz/ready');
      assert.strictEqual(readyRes.status, 503);
      const readyJson = await readyRes.json();
      assert.strictEqual(readyJson.status, 'Unhealthy');
      assert.ok(readyJson.entries['payment_gateway']);
      assert.strictEqual(readyJson.entries['ping'], undefined);
    } finally {
      await factory.dispose();
    }
  });

  it('supports custom response writer and custom status codes', async () => {
    const factory = new WebApplicationFactory(createCustomWriterApp);

    try {
      const client = await factory.createClient();
      const res = await client.get('/healthz/plain');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('content-type'), 'text/plain; charset=utf-8');
      const text = await res.text();
      assert.strictEqual(text, 'STATUS:Healthy');
    } finally {
      await factory.dispose();
    }
  });

  it('throws helpful diagnostic error if app.addHealthChecks() is called on app instance', () => {
    const builder = WebApplication.createBuilder();
    const app = builder.build();

    assert.throws(
      () => {
        (app as any).addHealthChecks();
      },
      /Cannot call app\.addHealthChecks\(\) after builder\.build\(\)/,
    );
  });
});
