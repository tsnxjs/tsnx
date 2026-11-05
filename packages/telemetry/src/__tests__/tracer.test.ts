// SPDX-License-Identifier: MIT

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Activity,
  formatTraceparent,
  generateSpanId,
  generateTraceId,
  parseTraceparent,
  Tracer,
} from '../index.js';

describe('@tsnx/telemetry: Tracer & Ambient Async Context', () => {
  it('generates standard W3C 32-character trace IDs and 16-character span IDs', () => {
    const traceId = generateTraceId();
    const spanId = generateSpanId();

    assert.strictEqual(traceId.length, 32);
    assert.strictEqual(/^[0-9a-f]{32}$/.test(traceId), true);

    assert.strictEqual(spanId.length, 16);
    assert.strictEqual(/^[0-9a-f]{16}$/.test(spanId), true);
  });

  it('parses and formats standard W3C traceparent headers', () => {
    const validHeader = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
    const parsed = parseTraceparent(validHeader);

    assert.ok(parsed);
    assert.strictEqual(parsed.traceId, '4bf92f3577b34da6a3ce929d0e0e4736');
    assert.strictEqual(parsed.parentSpanId, '00f067aa0ba902b7');
    assert.strictEqual(parsed.traceFlags, 1);
    assert.strictEqual(parsed.spanId.length, 16);

    const formatted = formatTraceparent(parsed);
    assert.strictEqual(formatted.startsWith('00-4bf92f3577b34da6a3ce929d0e0e4736-'), true);
  });

  it('maintains ambient async context inside tracer.trace() and isolates outside', async () => {
    const tracer = new Tracer({ serviceName: 'catalog-service' });

    // Outside trace: Activity.current and currentTraceId must be undefined
    assert.strictEqual(tracer.currentSpan, undefined);
    assert.strictEqual(tracer.currentTraceId, undefined);
    assert.strictEqual(Activity.current, undefined);

    let recordedTraceId: string | undefined;

    await tracer.trace('catalog.search', async (span) => {
      // Inside trace: ambient context must be active
      assert.strictEqual(tracer.currentSpan, span);
      assert.strictEqual(Activity.current, span);
      assert.ok(tracer.currentTraceId);
      assert.strictEqual(tracer.currentTraceId, span.context.traceId);

      recordedTraceId = span.context.traceId;
      span.setAttribute('query.term', 'electronics');
    });

    // After trace ends: context is restored to undefined
    assert.strictEqual(tracer.currentSpan, undefined);
    assert.strictEqual(tracer.currentTraceId, undefined);

    const spans = tracer.getRecentSpans();
    assert.strictEqual(spans.length, 1);
    assert.strictEqual(spans[0].traceId, recordedTraceId);
    assert.strictEqual(spans[0].name, 'catalog.search');
    assert.strictEqual(spans[0].attributes['query.term'], 'electronics');
    assert.strictEqual(spans[0].status.code, 'OK');
  });

  it('creates nested child spans linked to the parent trace and span', async () => {
    const tracer = new Tracer({ serviceName: 'order-service' });

    await tracer.trace('parent.order', async (parentSpan) => {
      parentSpan.setAttribute('order.id', '101');

      await tracer.trace('child.database_query', async (childSpan) => {
        // Child span must inherit traceId and set parentSpanId
        assert.strictEqual(childSpan.context.traceId, parentSpan.context.traceId);
        assert.strictEqual(childSpan.context.parentSpanId, parentSpan.context.spanId);
      });
    });

    const spans = tracer.getRecentSpans();
    assert.strictEqual(spans.length, 2);

    const child = spans.find((s) => s.name === 'child.database_query');
    const parent = spans.find((s) => s.name === 'parent.order');

    assert.ok(child);
    assert.ok(parent);
    assert.strictEqual(child.traceId, parent.traceId);
    assert.strictEqual(child.parentSpanId, parent.spanId);
  });

  it('records exception details and marks span status as ERROR when action throws', async () => {
    const tracer = new Tracer();

    await assert.rejects(
      async () => {
        await tracer.trace('failing.operation', async () => {
          throw new Error('Database unreachable');
        });
      },
      /Database unreachable/,
    );

    const spans = tracer.getRecentSpans();
    assert.strictEqual(spans.length, 1);
    assert.strictEqual(spans[0].status.code, 'ERROR');
    assert.strictEqual(spans[0].status.message, 'Database unreachable');

    const errorEvent = spans[0].events.find((e) => e.name === 'exception');
    assert.ok(errorEvent);
    assert.strictEqual(errorEvent.attributes?.['exception.message'], 'Database unreachable');
  });
});
