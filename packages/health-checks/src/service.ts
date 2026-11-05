// SPDX-License-Identifier: MIT

import { createToken, IServiceProvider } from '@tsnx/hosting-abstractions';
import {
  HealthCheckRegistration,
  HealthCheckResult,
  HealthReport,
  HealthReportEntry,
  HealthStatus,
  IHealthCheck,
} from './types.js';

export const HEALTH_CHECK_SERVICE = createToken<HealthCheckService>('HEALTH_CHECK_SERVICE');

/**
 * Core engine responsible for executing registered health checks and aggregating the health report.
 * Modeled after ASP.NET Core HealthCheckService.
 */
export class HealthCheckService {
  constructor(
    private readonly serviceProvider: IServiceProvider,
    private readonly registrations: HealthCheckRegistration[],
  ) {}

  /**
   * Returns all active registrations.
   */
  public getRegistrations(): readonly HealthCheckRegistration[] {
    return this.registrations;
  }

  /**
   * Executes health checks matching the optional predicate and produces an aggregated HealthReport.
   */
  public async checkHealth(
    predicate?: (registration: HealthCheckRegistration) => boolean,
    cancellationToken?: AbortSignal,
  ): Promise<HealthReport> {
    const startAll = performance.now();
    const targets = predicate
      ? this.registrations.filter(predicate)
      : this.registrations;

    const entries: Record<string, HealthReportEntry> = {};

    const tasks = targets.map(async (reg) => {
      const entryStart = performance.now();
      let checkInstance: IHealthCheck;

      try {
        checkInstance = reg.factory(this.serviceProvider);
      } catch (err) {
        const durationMs = Math.round((performance.now() - entryStart) * 100) / 100;
        entries[reg.name] = {
          status: reg.failureStatus,
          description: `Failed to resolve health check factory: ${err instanceof Error ? err.message : String(err)}`,
          durationMs,
          error: err instanceof Error ? err.message : String(err),
          tags: reg.tags,
        };
        return;
      }

      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      const abortController = new AbortController();

      if (cancellationToken) {
        if (cancellationToken.aborted) {
          abortController.abort(cancellationToken.reason);
        } else {
          cancellationToken.addEventListener(
            'abort',
            () => abortController.abort(cancellationToken.reason),
            { once: true },
          );
        }
      }

      const timeoutPromise = reg.timeoutMs && reg.timeoutMs > 0
        ? new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(() => {
              abortController.abort(new Error(`Health check timed out after ${reg.timeoutMs}ms`));
              reject(new Error(`Health check timed out after ${reg.timeoutMs}ms`));
            }, reg.timeoutMs);
          })
        : null;

      try {
        const checkExecution = checkInstance.checkHealth({
          registration: reg,
          cancellationToken: abortController.signal,
        });

        const result: HealthCheckResult = timeoutPromise
          ? await Promise.race([checkExecution, timeoutPromise])
          : await checkExecution;

        const durationMs = Math.round((performance.now() - entryStart) * 100) / 100;

        entries[reg.name] = {
          status: result.status,
          description: result.description,
          durationMs,
          data: result.data,
          error: result.error
            ? result.error instanceof Error
              ? result.error.message
              : String(result.error)
            : undefined,
          tags: reg.tags,
        };
      } catch (err) {
        const durationMs = Math.round((performance.now() - entryStart) * 100) / 100;
        entries[reg.name] = {
          status: reg.failureStatus,
          description: err instanceof Error ? err.message : String(err),
          durationMs,
          error: err instanceof Error ? err.message : String(err),
          tags: reg.tags,
        };
      } finally {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
      }
    });

    await Promise.allSettled(tasks);

    // Aggregate overall status
    let overallStatus: HealthStatus = 'Healthy';
    for (const entry of Object.values(entries)) {
      if (entry.status === 'Unhealthy') {
        overallStatus = 'Unhealthy';
        break; // Unhealthy takes highest precedence
      }
      if (entry.status === 'Degraded') {
        overallStatus = 'Degraded';
      }
    }

    const totalDurationMs = Math.round((performance.now() - startAll) * 100) / 100;

    return {
      status: overallStatus,
      totalDurationMs,
      entries,
    };
  }
}
