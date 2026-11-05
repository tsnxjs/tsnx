// SPDX-License-Identifier: MIT

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MetricsRegistry } from '../metrics.js';

describe('@tsnx/telemetry: MetricsRegistry', () => {
  it('records Counter increments and handles dimensional labels', () => {
    const registry = new MetricsRegistry();
    const counter = registry.createCounter('orders_total', 'Total orders processed');

    counter.inc(1, { status: 'created' });
    counter.inc(2, { status: 'created' });
    counter.inc(1, { status: 'rejected' });

    assert.strictEqual(counter.get({ status: 'created' }), 3);
    assert.strictEqual(counter.get({ status: 'rejected' }), 1);
    assert.strictEqual(counter.get({ status: 'unknown' }), 0);
  });

  it('records Gauge values, increments, and decrements', () => {
    const registry = new MetricsRegistry();
    const gauge = registry.createGauge('active_workers', 'Number of active workers');

    gauge.set(10, { pool: 'cpu' });
    gauge.inc(2, { pool: 'cpu' });
    gauge.dec(1, { pool: 'cpu' });

    assert.strictEqual(gauge.get({ pool: 'cpu' }), 11);
  });

  it('records Histogram latencies into configured buckets', () => {
    const registry = new MetricsRegistry();
    const hist = registry.createHistogram('request_latency_ms', 'Request duration', [10, 50, 100]);

    hist.record(5, { route: '/users' });
    hist.record(25, { route: '/users' });
    hist.record(75, { route: '/users' });
    hist.record(150, { route: '/users' });

    const snapshots = hist.getSnapshot();
    assert.strictEqual(snapshots.length, 1);
    const snap = snapshots[0];

    assert.strictEqual(snap.count, 4);
    assert.strictEqual(snap.sum, 255);

    const bucket10 = snap.buckets.find((b) => b.le === 10);
    const bucket50 = snap.buckets.find((b) => b.le === 50);
    const bucket100 = snap.buckets.find((b) => b.le === 100);

    assert.strictEqual(bucket10?.count, 1); // 5
    assert.strictEqual(bucket50?.count, 2); // 5, 25
    assert.strictEqual(bucket100?.count, 3); // 5, 25, 75
  });

  it('generates valid Prometheus text exposition output', () => {
    const registry = new MetricsRegistry();
    const counter = registry.createCounter('http_requests_total', 'HTTP request count');
    counter.inc(5, { method: 'GET' });

    const output = registry.toPrometheusText();
    assert.match(output, /# HELP http_requests_total HTTP request count/);
    assert.match(output, /# TYPE http_requests_total counter/);
    assert.match(output, /http_requests_total\{method="GET"\} 5/);
  });

  it('generates structured JSON snapshots for TSNX Studio visual dashboard', () => {
    const registry = new MetricsRegistry();
    const gauge = registry.createGauge('memory_usage_mb', 'Memory usage in MB');
    gauge.set(256);

    const snapshot = registry.getSnapshot();
    assert.ok(snapshot.gauges);
    assert.ok((snapshot.gauges as any)['memory_usage_mb']);
  });
});
