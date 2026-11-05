// SPDX-License-Identifier: MIT

/**
 * W3C standard trace context identifying an individual trace and span.
 */
export interface SpanContext {
  traceId: string;
  spanId: string;
  traceFlags?: number;
  parentSpanId?: string;
}

/**
 * Type of work represented by a span.
 */
export type SpanKind = 'Internal' | 'Server' | 'Client' | 'Producer' | 'Consumer';

export const SpanKind = {
  Internal: 'Internal' as const,
  Server: 'Server' as const,
  Client: 'Client' as const,
  Producer: 'Producer' as const,
  Consumer: 'Consumer' as const,
};

/**
 * Outcome status code of a span.
 */
export type SpanStatusCode = 'UNSET' | 'OK' | 'ERROR';

export const SpanStatusCode = {
  UNSET: 'UNSET' as const,
  OK: 'OK' as const,
  ERROR: 'ERROR' as const,
};

export interface SpanStatus {
  code: SpanStatusCode;
  message?: string;
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, unknown>;
}

/**
 * Serialized representation of a finished span, used for in-memory buffer, TSNX Studio, and OTLP.
 */
export interface SpanData {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: SpanKind;
  startTime: number;
  endTime: number;
  durationMs: number;
  status: SpanStatus;
  attributes: Record<string, unknown>;
  events: SpanEvent[];
}

/**
 * Options when creating a new span.
 */
export interface SpanOptions {
  kind?: SpanKind;
  attributes?: Record<string, unknown>;
  parentContext?: SpanContext;
}

/**
 * Active span being recorded.
 */
export interface Span {
  readonly context: SpanContext;
  readonly name: string;
  readonly kind: SpanKind;
  readonly startTime: number;
  endTime?: number;
  durationMs?: number;
  readonly status: SpanStatus;

  setAttribute(key: string, value: unknown): this;
  setAttributes(attributes: Record<string, unknown>): this;
  addEvent(name: string, attributes?: Record<string, unknown>): this;
  recordError(error: Error | unknown): this;
  setStatus(code: SpanStatusCode, message?: string): this;
  end(): void;
  toSpanData(): SpanData;
}

/**
 * Tracer interface available for dependency injection and manual instrumentation.
 * Modeled after OpenTelemetry Tracer and NestJS Observe TracerService.
 */
export interface ITracer {
  /**
   * Returns the ambient span in the current async context, or undefined if outside an instrumented scope.
   */
  readonly currentSpan: Span | undefined;

  /**
   * Returns the current ambient trace ID (32 hex characters), or undefined if none.
   */
  readonly currentTraceId: string | undefined;

  /**
   * Executes an asynchronous operation wrapped inside a child span attached to the current ambient context.
   */
  trace<T>(
    name: string,
    fn: (span: Span) => Promise<T> | T,
    options?: SpanOptions,
  ): Promise<T>;

  /**
   * Starts a new span without automatically ending it or binding ambient context.
   */
  startSpan(name: string, options?: SpanOptions): Span;
}

/**
 * Configuration options for the Telemetry subsystem.
 */
export interface TelemetryOptions {
  /**
   * Service name used in distributed traces and metrics.
   * Default: 'tsnx-service'.
   */
  serviceName?: string;

  /**
   * Application version.
   * Default: '1.0.0'.
   */
  serviceVersion?: string;

  /**
   * Deployment environment (development, staging, production).
   * Default: process.env.NODE_ENV ?? 'development'.
   */
  environment?: string;

  /**
   * Maximum number of spans stored in memory for TSNX Studio inspection.
   * Default: 1000.
   */
  ringBufferSize?: number;

  /**
   * OTLP HTTP collector endpoint (e.g. 'http://localhost:4318/v1/traces').
   * Default: process.env.OTEL_EXPORTER_OTLP_ENDPOINT.
   */
  otlpEndpoint?: string;

  /**
   * TSNX Studio dashboard endpoint (e.g. 'http://localhost:4200').
   * Default: process.env.TSNX_STUDIO_ENDPOINT.
   */
  studioEndpoint?: string;
}
