// SPDX-License-Identifier: MIT

import {
  createToken,
  IServiceCollection,
} from '@tsnx/hosting-abstractions';
import {
  HttpContext,
  RouteHandlerBuilder,
  ServiceCollection,
  WebApplication,
} from '@tsnx/web';
import { ITracer, TelemetryOptions } from './types.js';
import { Tracer } from './tracer.js';
import { MetricsRegistry } from './metrics.js';
import { createTelemetryMiddleware } from './middleware.js';

export const ITracerToken = createToken<ITracer>('ITracer');
export const IMetricsToken = createToken<MetricsRegistry>('IMetricsRegistry');

/**
 * Adds and configures the TSNX Telemetry, Tracing, and Metrics Subsystem in DI.
 * Modeled after OpenTelemetry and NestJS Observe.
 *
 * Single Canonical Style: `builder.services.addTelemetry(options => ...)`
 */
export function addTelemetry(
  services: IServiceCollection,
  configure?: (options: TelemetryOptions) => void,
): Tracer {
  const options: TelemetryOptions = {};
  if (configure) {
    configure(options);
  }

  const tracer = new Tracer(options);
  const metrics = new MetricsRegistry();

  // Register in DI container
  services.add({
    token: ITracerToken,
    lifetime: 'singleton',
    instance: tracer,
  });

  services.add({
    token: IMetricsToken,
    lifetime: 'singleton',
    instance: metrics,
  });

  return tracer;
}

// Module augmentations on IServiceCollection, ServiceCollection, and WebApplication
declare module '@tsnx/hosting-abstractions' {
  interface IServiceCollection {
    /**
     * Adds and configures the TSNX Telemetry, Distributed Tracing, and Metrics Subsystem in DI.
     * Modeled after OpenTelemetry builder.services.addTelemetry().
     */
    addTelemetry(configure?: (options: TelemetryOptions) => void): Tracer;
  }
}

declare module '@tsnx/hosting' {
  interface ServiceCollection {
    /**
     * Adds and configures the TSNX Telemetry, Distributed Tracing, and Metrics Subsystem in DI.
     * Modeled after OpenTelemetry builder.services.addTelemetry().
     */
    addTelemetry(configure?: (options: TelemetryOptions) => void): Tracer;
  }
}

declare module '@tsnx/web' {
  interface WebApplication {
    /**
     * Enables automatic HTTP telemetry tracing and metrics collection middleware in the pipeline.
     */
    useTelemetry(): this;

    /**
     * Maps a Prometheus scrape endpoint exposing application metrics in Prometheus text format.
     * Defaults to '/metrics'.
     */
    mapMetrics(pattern?: string): RouteHandlerBuilder;

    /**
     * Maps a TSNX Studio telemetry streaming and inspection endpoint exposing recent traces and metrics.
     * Defaults to '/_tsnx/telemetry'.
     */
    mapTelemetry(pattern?: string): RouteHandlerBuilder;

    /**
     * Diagnostic guard: hints user if addTelemetry was accidentally called on app instead of builder.services.
     */
    addTelemetry?(...args: any[]): never;
  }
}

// Attach prototype methods to ServiceCollection
if (!(ServiceCollection.prototype as any).addTelemetry) {
  (ServiceCollection.prototype as any).addTelemetry = function (
    this: ServiceCollection,
    configure?: (options: TelemetryOptions) => void,
  ): Tracer {
    return addTelemetry(this, configure);
  };
}

// Attach prototype methods to WebApplication
if (!(WebApplication.prototype as any).useTelemetry) {
  (WebApplication.prototype as any).useTelemetry = function (this: WebApplication): WebApplication {
    let resolvedMiddleware: ReturnType<typeof createTelemetryMiddleware> | undefined;

    this.use(async (ctx: HttpContext, next) => {
      if (!resolvedMiddleware) {
        const tracer = ctx.services.getOptional<Tracer>(ITracerToken);
        const metrics = ctx.services.getOptional<MetricsRegistry>(IMetricsToken);

        if (tracer && metrics) {
          resolvedMiddleware = createTelemetryMiddleware(tracer, metrics);
        }
      }

      if (resolvedMiddleware) {
        await resolvedMiddleware(ctx, next);
      } else {
        await next(ctx);
      }
    });

    return this;
  };
}

if (!(WebApplication.prototype as any).mapMetrics) {
  (WebApplication.prototype as any).mapMetrics = function (
    this: WebApplication,
    pattern = '/metrics',
  ): RouteHandlerBuilder {
    const builder = this.mapGet(pattern, async (ctx: HttpContext) => {
      const metrics = ctx.services.getOptional<MetricsRegistry>(IMetricsToken);
      const text = metrics ? metrics.toPrometheusText() : '';
      await ctx.response.writeText(text, 200, 'text/plain; version=0.0.4; charset=utf-8');
    });

    if (typeof (builder as any).allowAnonymous === 'function') {
      (builder as any).allowAnonymous();
    }

    return builder;
  };
}

if (!(WebApplication.prototype as any).mapTelemetry) {
  (WebApplication.prototype as any).mapTelemetry = function (
    this: WebApplication,
    pattern = '/_tsnx/telemetry',
  ): RouteHandlerBuilder {
    const builder = this.mapGet(pattern, async (ctx: HttpContext) => {
      const tracer = ctx.services.getOptional<Tracer>(ITracerToken);
      const metrics = ctx.services.getOptional<MetricsRegistry>(IMetricsToken);

      ctx.response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      await ctx.response.writeJson({
        service: tracer?.options.serviceName ?? 'unknown',
        version: tracer?.options.serviceVersion ?? '1.0.0',
        environment: tracer?.options.environment ?? 'development',
        traces: tracer ? tracer.getRecentSpans(100) : [],
        metrics: metrics ? metrics.getSnapshot() : {},
      });
    });

    if (typeof (builder as any).allowAnonymous === 'function') {
      (builder as any).allowAnonymous();
    }

    return builder;
  };
}

// Diagnostic stubs if called on app
if (!(WebApplication.prototype as any).addTelemetry) {
  (WebApplication.prototype as any).addTelemetry = function () {
    throw new Error(
      'Cannot call app.addTelemetry() after builder.build(). Services must be configured before building the application. Use builder.services.addTelemetry() before builder.build(), and app.useTelemetry() or app.mapMetrics() on app.',
    );
  };
}
