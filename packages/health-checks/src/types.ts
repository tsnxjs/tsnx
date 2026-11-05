// SPDX-License-Identifier: MIT

import type { IServiceProvider } from '@tsnx/hosting-abstractions';
import type { HttpContext } from '@tsnx/web';

/**
 * Represents the reported status of a health check result.
 * Directly aligned with ASP.NET Core HealthStatus.
 */
export type HealthStatus = 'Healthy' | 'Degraded' | 'Unhealthy';

export const HealthStatus = {
  Healthy: 'Healthy' as const,
  Degraded: 'Degraded' as const,
  Unhealthy: 'Unhealthy' as const,
};

/**
 * Represents the result of an individual health check.
 */
export class HealthCheckResult {
  constructor(
    public readonly status: HealthStatus,
    public readonly description?: string,
    public readonly data?: Record<string, unknown>,
    public readonly error?: Error | unknown,
    public readonly durationMs?: number,
  ) {}

  /**
   * Creates a Healthy check result (HTTP 200).
   */
  public static healthy(
    description?: string,
    data?: Record<string, unknown>,
  ): HealthCheckResult {
    return new HealthCheckResult('Healthy', description, data);
  }

  /**
   * Creates a Degraded check result (HTTP 200, but degraded service state).
   */
  public static degraded(
    description?: string,
    data?: Record<string, unknown>,
    error?: Error | unknown,
  ): HealthCheckResult {
    return new HealthCheckResult('Degraded', description, data, error);
  }

  /**
   * Creates an Unhealthy check result (HTTP 503).
   */
  public static unhealthy(
    description?: string,
    error?: Error | unknown,
    data?: Record<string, unknown>,
  ): HealthCheckResult {
    return new HealthCheckResult('Unhealthy', description, data, error);
  }
}

/**
 * Metadata and cancellation token passed to an IHealthCheck execution.
 */
export interface HealthCheckContext {
  registration: HealthCheckRegistration;
  cancellationToken?: AbortSignal;
}

/**
 * Represents a component that checks the health of a subsystem.
 * Modeled after ASP.NET Core IHealthCheck.
 */
export interface IHealthCheck {
  checkHealth(context?: HealthCheckContext): Promise<HealthCheckResult>;
}

/**
 * Inline functional health check.
 */
export type HealthCheckFn = (
  context?: HealthCheckContext,
) => Promise<HealthCheckResult> | HealthCheckResult;

/**
 * Configuration options when registering an individual health check.
 */
export interface HealthCheckOptions {
  /**
   * Status to assign if the health check throws an unhandled exception or times out.
   * Defaults to 'Unhealthy'.
   */
  failureStatus?: HealthStatus;

  /**
   * A list of tags used for filtering checks (e.g. ['live'], ['ready'], ['db']).
   */
  tags?: string[];

  /**
   * Timeout in milliseconds for this specific check.
   */
  timeoutMs?: number;
}

/**
 * Internal registration entry holding the check's factory and metadata.
 */
export interface HealthCheckRegistration {
  name: string;
  factory: (sp: IServiceProvider) => IHealthCheck;
  failureStatus: HealthStatus;
  tags: string[];
  timeoutMs?: number;
}

/**
 * Output entry for each health check in the aggregated report.
 */
export interface HealthReportEntry {
  status: HealthStatus;
  description?: string;
  durationMs: number;
  data?: Record<string, unknown>;
  error?: string;
  tags: string[];
}

/**
 * Aggregated health report containing overall status and details for each check.
 */
export interface HealthReport {
  status: HealthStatus;
  totalDurationMs: number;
  entries: Record<string, HealthReportEntry>;
}

/**
 * Options configuring the mapHealthChecks HTTP endpoint.
 */
export interface HealthCheckEndpointOptions {
  /**
   * Predicate used to filter which checks to execute for this endpoint.
   * Useful for separating liveness vs readiness probes:
   * e.g. `check => check.tags.includes('live')`
   */
  predicate?: (registration: HealthCheckRegistration) => boolean;

  /**
   * Custom HTTP status codes mapped to each HealthStatus.
   * Defaults to:
   * - Healthy: 200
   * - Degraded: 200
   * - Unhealthy: 503
   */
  resultStatusCodes?: Partial<Record<HealthStatus, number>>;

  /**
   * Custom response writer function for formatting the HTTP response body and headers.
   */
  responseWriter?: (
    ctx: HttpContext,
    report: HealthReport,
  ) => Promise<any> | any;

  /**
   * Whether anonymous access is permitted on this endpoint without requiring authentication.
   * Defaults to true.
   */
  allowAnonymous?: boolean;
}
