// SPDX-License-Identifier: MIT

import { AsyncLocalStorage } from 'node:async_hooks';
import { Span, SpanContext } from './types.js';

const ambientStorage = new AsyncLocalStorage<Span>();

/**
 * Generates a standard W3C 32-character lowercase hex Trace ID (16 bytes).
 */
export function generateTraceId(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a standard W3C 16-character lowercase hex Span ID (8 bytes).
 */
export function generateSpanId(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Parses a standard W3C 'traceparent' header (e.g. '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01').
 */
export function parseTraceparent(header?: string): SpanContext | undefined {
  if (!header) return undefined;

  const parts = header.trim().split('-');
  if (parts.length < 4) return undefined;

  const [version, traceId, parentSpanId, flagsStr] = parts;

  // W3C format validation: version must be 2 hex chars, traceId 32, spanId 16, flags 2
  if (version !== '00' && version.length !== 2) return undefined;
  if (traceId.length !== 32 || /^[0]+$/.test(traceId)) return undefined;
  if (parentSpanId.length !== 16 || /^[0]+$/.test(parentSpanId)) return undefined;

  const flags = parseInt(flagsStr, 16);

  return {
    traceId,
    spanId: generateSpanId(),
    parentSpanId,
    traceFlags: Number.isNaN(flags) ? 1 : flags,
  };
}

/**
 * Formats a SpanContext into a standard W3C 'traceparent' header value.
 */
export function formatTraceparent(context: SpanContext): string {
  const flags = (context.traceFlags ?? 1).toString(16).padStart(2, '0');
  return `00-${context.traceId}-${context.spanId}-${flags}`;
}

/**
 * Ambient activity accessor modeled after .NET System.Diagnostics.Activity.Current
 * and NestJS Observe ambient async context.
 */
export class Activity {
  /**
   * Returns the ambient span active in the current async execution context, or undefined.
   */
  public static get current(): Span | undefined {
    return ambientStorage.getStore();
  }

  /**
   * Returns the ambient trace ID active in the current async execution context, or undefined.
   */
  public static get currentTraceId(): string | undefined {
    return ambientStorage.getStore()?.context.traceId;
  }

  /**
   * Executes the specified function within the ambient context of the given span.
   */
  public static run<R>(span: Span, fn: () => R): R {
    return ambientStorage.run(span, fn);
  }
}
