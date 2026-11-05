// SPDX-License-Identifier: MIT

import {
  Constructor,
  IServiceCollection,
  IServiceProvider,
} from '@tsnx/hosting-abstractions';
import { ServiceCollection, WebApplication } from '@tsnx/web';
import {
  HealthCheckFn,
  HealthCheckOptions,
  HealthCheckRegistration,
  HealthCheckResult,
  IHealthCheck,
} from './types.js';
import {
  HEALTH_CHECK_SERVICE,
  HealthCheckService,
} from './service.js';

/**
 * Fluent builder used to register individual health checks in the DI container.
 */
export class HealthChecksBuilder {
  private readonly registrations: HealthCheckRegistration[] = [];

  constructor(public readonly services: IServiceCollection) {}

  /**
   * Adds an instance or inline function health check.
   */
  public addCheck(
    name: string,
    check: IHealthCheck | HealthCheckFn,
    options: HealthCheckOptions = {},
  ): this {
    const factory = (_sp: IServiceProvider): IHealthCheck => {
      if (typeof check === 'function') {
        return {
          checkHealth: async (ctx) => {
            const res = await check(ctx);
            return res instanceof HealthCheckResult
              ? res
              : HealthCheckResult.healthy();
          },
        };
      }
      return check;
    };

    this.registrations.push({
      name,
      factory,
      failureStatus: options.failureStatus ?? 'Unhealthy',
      tags: options.tags ?? [],
      timeoutMs: options.timeoutMs,
    });

    return this;
  }

  /**
   * Adds a health check resolved via dependency injection by class type.
   */
  public addTypeCheck<T extends IHealthCheck>(
    name: string,
    checkType: Constructor<T>,
    options: HealthCheckOptions = {},
  ): this {
    this.registrations.push({
      name,
      factory: (sp: IServiceProvider) => {
        return sp.get(checkType);
      },
      failureStatus: options.failureStatus ?? 'Unhealthy',
      tags: options.tags ?? [],
      timeoutMs: options.timeoutMs,
    });

    return this;
  }

  /**
   * Returns all accumulated registrations.
   */
  public getRegistrations(): readonly HealthCheckRegistration[] {
    return this.registrations;
  }
}

/**
 * Adds and configures the TSNX Health Checks Subsystem in the dependency injection container.
 * Modeled after ASP.NET Core services.AddHealthChecks().
 *
 * Single Canonical Style: `builder.services.addHealthChecks(hc => ...)`
 */
export function addHealthChecks(
  services: IServiceCollection,
  configure?: (builder: HealthChecksBuilder) => void,
): HealthChecksBuilder {
  const hcBuilder = new HealthChecksBuilder(services);

  if (configure) {
    configure(hcBuilder);
  }

  // Register HealthCheckService in DI as singleton
  services.add({
    token: HEALTH_CHECK_SERVICE,
    lifetime: 'singleton',
    factory: (sp) => new HealthCheckService(sp, [...hcBuilder.getRegistrations()]),
  });

  return hcBuilder;
}

// Module augmentations on IServiceCollection and ServiceCollection
declare module '@tsnx/hosting-abstractions' {
  interface IServiceCollection {
    /**
     * Adds and configures the TSNX Health Checks Subsystem in DI.
     * Modeled after ASP.NET Core builder.services.addHealthChecks().
     */
    addHealthChecks(
      configure?: (builder: HealthChecksBuilder) => void,
    ): HealthChecksBuilder;
  }
}

declare module '@tsnx/hosting' {
  interface ServiceCollection {
    /**
     * Adds and configures the TSNX Health Checks Subsystem in DI.
     * Modeled after ASP.NET Core builder.services.addHealthChecks().
     */
    addHealthChecks(
      configure?: (builder: HealthChecksBuilder) => void,
    ): HealthChecksBuilder;
  }
}

declare module '@tsnx/web' {
  interface WebApplication {
    /**
     * Diagnostic guard: hints user if addHealthChecks was accidentally called on app instead of builder.services.
     */
    addHealthChecks?(...args: any[]): never;
  }
}

// Attach prototype method to ServiceCollection
if (!(ServiceCollection.prototype as any).addHealthChecks) {
  (ServiceCollection.prototype as any).addHealthChecks = function (
    this: ServiceCollection,
    configure?: (builder: HealthChecksBuilder) => void,
  ): HealthChecksBuilder {
    return addHealthChecks(this, configure);
  };
}

// Diagnostic stubs if called on app
if (!(WebApplication.prototype as any).addHealthChecks) {
  (WebApplication.prototype as any).addHealthChecks = function () {
    throw new Error(
      'Cannot call app.addHealthChecks() after builder.build(). Services must be configured before building the application. Use builder.services.addHealthChecks() before builder.build(), and app.mapHealthChecks() on app.',
    );
  };
}
