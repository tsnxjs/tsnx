// SPDX-License-Identifier: MIT

import { HttpContext, HttpResult, Results, RouteHandler, RouteHandlerBuilder, WebApplication } from '@tsnx/web';
import { HealthCheckEndpointOptions, HealthReport, HealthStatus } from './types.js';
import { HEALTH_CHECK_SERVICE, HealthCheckService } from './service.js';

const DEFAULT_STATUS_CODES: Record<HealthStatus, number> = {
  Healthy: 200,
  Degraded: 200,
  Unhealthy: 503,
};

/**
 * Default HTTP response writer outputting standard JSON health report with no-cache headers.
 */
export async function defaultHealthResponseWriter(
  ctx: HttpContext,
  report: HealthReport,
  statusCodes: Record<HealthStatus, number> = DEFAULT_STATUS_CODES,
): Promise<void> {
  const statusCode = statusCodes[report.status] ?? (report.status === 'Unhealthy' ? 503 : 200);

  ctx.response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  ctx.response.setHeader('Pragma', 'no-cache');

  await ctx.response.writeJson(report, statusCode);
}

declare module '@tsnx/web' {
  interface WebApplication {
    /**
     * Maps an HTTP endpoint that executes health checks and writes a health report.
     * Modeled after ASP.NET Core `app.MapHealthChecks()`.
     *
     * @param pattern Route pattern (e.g. '/healthz', '/healthz/ready', '/healthz/live')
     * @param options Configuration options including predicates and custom response writers.
     */
    mapHealthChecks(
      pattern: string,
      options?: HealthCheckEndpointOptions,
    ): RouteHandlerBuilder;
  }
}

/**
 * Maps an HTTP endpoint that executes registered health checks and returns a health report.
 * Modeled after ASP.NET Core `app.MapHealthChecks()`.
 */
export function mapHealthChecks(
  app: WebApplication,
  pattern: string,
  options: HealthCheckEndpointOptions = {},
): RouteHandlerBuilder {
  const statusCodes: Record<HealthStatus, number> = {
    ...DEFAULT_STATUS_CODES,
    ...(options.resultStatusCodes ?? {}),
  };

  const handler: RouteHandler = async (ctx: HttpContext) => {
    const healthService = ctx.services.getOptional<HealthCheckService>(HEALTH_CHECK_SERVICE);

    if (!healthService) {
      return Results.json(
        {
          status: 'Unhealthy',
          error: 'HealthCheckService is not registered. Call builder.services.addHealthChecks() in your application setup.',
        },
        500,
      );
    }

    const report = await healthService.checkHealth(options.predicate);

    if (options.responseWriter) {
      const res = await options.responseWriter(ctx, report);
      if (res && typeof (res as HttpResult).executeAsync === 'function') {
        return res;
      }
      return;
    }

    const statusCode = statusCodes[report.status] ?? (report.status === 'Unhealthy' ? 503 : 200);
    ctx.response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    ctx.response.setHeader('Pragma', 'no-cache');
    return Results.json(report, statusCode);
  };

  const builder = app.mapGet(pattern, handler);

  // If @tsnx/auth is in use, exempt health check endpoints from mandatory auth policies by default
  const allowAnon = options.allowAnonymous ?? true;
  if (allowAnon && typeof (builder as any).allowAnonymous === 'function') {
    (builder as any).allowAnonymous();
  }

  return builder;
}

// Attach prototype method to WebApplication for fluent chaining
if (!(WebApplication.prototype as any).mapHealthChecks) {
  (WebApplication.prototype as any).mapHealthChecks = function (
    this: WebApplication,
    pattern: string,
    options?: HealthCheckEndpointOptions,
  ): RouteHandlerBuilder {
    return mapHealthChecks(this, pattern, options);
  };
}
