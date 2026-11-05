// SPDX-License-Identifier: MIT

import {
  ITracer,
  Span,
  SpanContext,
  SpanData,
  SpanEvent,
  SpanKind,
  SpanOptions,
  SpanStatus,
  SpanStatusCode,
  TelemetryOptions,
} from './types.js';
import {
  Activity,
  generateSpanId,
  generateTraceId,
} from './context.js';

/**
 * High-performance in-memory ring buffer holding the most recent finished spans for TSNX Studio.
 */
export class RingBuffer<T> {
  private readonly buffer: (T | undefined)[];
  private head = 0;
  private count = 0;

  constructor(public readonly capacity: number) {
    this.buffer = new Array(capacity);
  }

  public push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }
  }

  public getAll(): T[] {
    const result: T[] = [];
    if (this.count === 0) return result;

    const start = (this.head - this.count + this.capacity) % this.capacity;
    for (let i = 0; i < this.count; i++) {
      const idx = (start + i) % this.capacity;
      const item = this.buffer[idx];
      if (item !== undefined) {
        result.push(item);
      }
    }
    return result;
  }

  public clear(): void {
    this.buffer.fill(undefined);
    this.head = 0;
    this.count = 0;
  }
}

/**
 * Concrete implementation of the active Span interface.
 */
export class SpanImpl implements Span {
  public endTime?: number;
  public durationMs?: number;
  public status: SpanStatus = { code: 'UNSET' };
  private readonly attributes = new Map<string, unknown>();
  private readonly events: SpanEvent[] = [];
  private isEnded = false;

  constructor(
    public readonly context: SpanContext,
    public readonly name: string,
    public readonly kind: SpanKind,
    public readonly startTime: number,
    private readonly onEnd: (spanData: SpanData) => void,
    initialAttributes: Record<string, unknown> = {},
  ) {
    this.setAttributes(initialAttributes);
  }

  public setAttribute(key: string, value: unknown): this {
    if (!this.isEnded) {
      this.attributes.set(key, value);
    }
    return this;
  }

  public setAttributes(attributes: Record<string, unknown>): this {
    if (!this.isEnded) {
      for (const [k, v] of Object.entries(attributes)) {
        this.attributes.set(k, v);
      }
    }
    return this;
  }

  public addEvent(name: string, attributes?: Record<string, unknown>): this {
    if (!this.isEnded) {
      this.events.push({
        name,
        timestamp: performance.now(),
        attributes,
      });
    }
    return this;
  }

  public recordError(error: Error | unknown): this {
    if (!this.isEnded) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      this.setStatus('ERROR', message);
      this.addEvent('exception', {
        'exception.message': message,
        'exception.stacktrace': stack,
        'exception.type': error instanceof Error ? error.constructor.name : typeof error,
      });
    }
    return this;
  }

  public setStatus(code: SpanStatusCode, message?: string): this {
    if (!this.isEnded) {
      this.status = { code, message };
    }
    return this;
  }

  public end(): void {
    if (this.isEnded) return;

    this.isEnded = true;
    this.endTime = performance.now();
    this.durationMs = Math.round((this.endTime - this.startTime) * 100) / 100;

    if (this.status.code === 'UNSET') {
      this.status = { code: 'OK' };
    }

    this.onEnd(this.toSpanData());
  }

  public toSpanData(): SpanData {
    const rawAttrs: Record<string, unknown> = {};
    for (const [k, v] of this.attributes) {
      rawAttrs[k] = v;
    }

    return {
      traceId: this.context.traceId,
      spanId: this.context.spanId,
      parentSpanId: this.context.parentSpanId,
      name: this.name,
      kind: this.kind,
      startTime: this.startTime,
      endTime: this.endTime ?? performance.now(),
      durationMs: this.durationMs ?? 0,
      status: this.status,
      attributes: rawAttrs,
      events: [...this.events],
    };
  }
}

/**
 * Concrete Tracer managing active spans, parent hierarchy, and ambient context.
 */
export class Tracer implements ITracer {
  private readonly ringBuffer: RingBuffer<SpanData>;
  public readonly options: Required<TelemetryOptions>;

  constructor(options: TelemetryOptions = {}) {
    this.options = {
      serviceName: options.serviceName ?? 'tsnx-service',
      serviceVersion: options.serviceVersion ?? '1.0.0',
      environment: options.environment ?? process.env.NODE_ENV ?? 'development',
      ringBufferSize: options.ringBufferSize ?? 1000,
      otlpEndpoint: options.otlpEndpoint ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? '',
      studioEndpoint: options.studioEndpoint ?? process.env.TSNX_STUDIO_ENDPOINT ?? '',
    };

    this.ringBuffer = new RingBuffer<SpanData>(this.options.ringBufferSize);
  }

  public get currentSpan(): Span | undefined {
    return Activity.current;
  }

  public get currentTraceId(): string | undefined {
    return Activity.currentTraceId;
  }

  public startSpan(name: string, options: SpanOptions = {}): Span {
    const parent = options.parentContext ?? Activity.current?.context;

    const context: SpanContext = {
      traceId: parent ? parent.traceId : generateTraceId(),
      spanId: generateSpanId(),
      parentSpanId: parent?.spanId,
      traceFlags: parent?.traceFlags ?? 1,
    };

    const initialAttributes = {
      'service.name': this.options.serviceName,
      'service.version': this.options.serviceVersion,
      'deployment.environment': this.options.environment,
      ...(options.attributes ?? {}),
    };

    return new SpanImpl(
      context,
      name,
      options.kind ?? (parent ? 'Internal' : 'Server'),
      performance.now(),
      (spanData) => this.recordSpan(spanData),
      initialAttributes,
    );
  }

  public async trace<T>(
    name: string,
    fn: (span: Span) => Promise<T> | T,
    options: SpanOptions = {},
  ): Promise<T> {
    const span = this.startSpan(name, options);

    return await Activity.run(span, async () => {
      try {
        const result = await fn(span);
        return result;
      } catch (error) {
        span.recordError(error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private recordSpan(spanData: SpanData): void {
    this.ringBuffer.push(spanData);
  }

  /**
   * Retrieves recorded spans from memory (for TSNX Studio visual waterfall inspection).
   */
  public getRecentSpans(limit?: number): SpanData[] {
    const spans = this.ringBuffer.getAll();
    if (limit && limit > 0) {
      return spans.slice(-limit);
    }
    return spans;
  }
}
