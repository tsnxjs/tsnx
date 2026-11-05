// SPDX-License-Identifier: MIT

import {
  createToken,
  IServiceCollection,
  ServiceIdentifier,
} from '@tsnx/hosting-abstractions';
import { ServiceCollection, WebApplication } from '@tsnx/web';
import {
  CircuitBreakerOptions,
  FallbackOptions,
  ResilienceStrategy,
  RetryOptions,
  TimeoutOptions,
} from './types.js';
import { TimeoutStrategy } from './strategies/timeout.js';
import { RetryStrategy } from './strategies/retry.js';
import { CircuitBreakerStrategy } from './strategies/circuit-breaker.js';
import { FallbackStrategy } from './strategies/fallback.js';
import { ResiliencePipeline } from './pipeline.js';

export const RESILIENCE_REGISTRY = createToken<ResilienceRegistry>('RESILIENCE_REGISTRY');

/**
 * Fluent builder used to assemble strategies into a ResiliencePipeline.
 */
export class ResiliencePipelineBuilder<TResult = any> {
  private readonly strategies: ResilienceStrategy[] = [];

  /**
   * Adds an operation timeout strategy.
   */
  public addTimeout(optionsOrMs: TimeoutOptions | number): this {
    const options: TimeoutOptions =
      typeof optionsOrMs === 'number'
        ? { timeoutMs: optionsOrMs }
        : optionsOrMs;

    this.strategies.push(new TimeoutStrategy(options));
    return this;
  }

  /**
   * Adds a retry strategy with exponential/linear backoff and jitter.
   */
  public addRetry(options: RetryOptions = {}): this {
    this.strategies.push(new RetryStrategy(options));
    return this;
  }

  /**
   * Adds a circuit breaker strategy to fast-fail when downstream services degrade.
   */
  public addCircuitBreaker(options: CircuitBreakerOptions = {}): this {
    this.strategies.push(new CircuitBreakerStrategy(options));
    return this;
  }

  /**
   * Adds a fallback strategy returning alternate data when preceding strategies fail.
   */
  public addFallback(options: FallbackOptions<TResult>): this {
    this.strategies.push(new FallbackStrategy<TResult>(options));
    return this;
  }

  /**
   * Appends a custom resilience strategy.
   */
  public addStrategy(strategy: ResilienceStrategy): this {
    this.strategies.push(strategy);
    return this;
  }

  /**
   * Builds the final immutable ResiliencePipeline.
   */
  public build(name?: string): ResiliencePipeline<TResult> {
    return new ResiliencePipeline<TResult>([...this.strategies], name);
  }
}

/**
 * Central registry holding configured resilience pipelines across the application.
 */
export class ResilienceRegistry {
  private readonly pipelines = new Map<ServiceIdentifier<any>, ResiliencePipeline<any>>();

  constructor(private readonly services: IServiceCollection) {}

  /**
   * Configures and registers a named or tokenized ResiliencePipeline into DI.
   */
  public addPipeline<T>(
    token: ServiceIdentifier<ResiliencePipeline<T>>,
    configure: (builder: ResiliencePipelineBuilder<T>) => void,
  ): this {
    const builder = new ResiliencePipelineBuilder<T>();
    configure(builder);

    const name = typeof token === 'string' ? token : token.toString();
    const pipeline = builder.build(name);

    this.pipelines.set(token, pipeline);

    // Register directly in DI so it can be resolved via sp.get(token) or ctx.services.get(token)
    this.services.add({
      token,
      lifetime: 'singleton',
      instance: pipeline,
    });

    return this;
  }

  /**
   * Retrieves a pipeline registered under the given token.
   */
  public getPipeline<T>(
    token: ServiceIdentifier<ResiliencePipeline<T>>,
  ): ResiliencePipeline<T> | undefined {
    return this.pipelines.get(token) as ResiliencePipeline<T> | undefined;
  }

  /**
   * Returns all active pipelines (for inspection by TSNX Studio).
   */
  public getAllPipelines(): ReadonlyMap<ServiceIdentifier<any>, ResiliencePipeline<any>> {
    return this.pipelines;
  }
}

/**
 * Adds and configures the TSNX Resilience Subsystem in the dependency injection container.
 * Modeled after Microsoft.Extensions.Resilience.
 *
 * Single Canonical Style: `builder.services.addResilience(resilience => ...)`
 */
export function addResilience(
  services: IServiceCollection,
  configure?: (registry: ResilienceRegistry) => void,
): ResilienceRegistry {
  const registry = new ResilienceRegistry(services);

  if (configure) {
    configure(registry);
  }

  services.add({
    token: RESILIENCE_REGISTRY,
    lifetime: 'singleton',
    instance: registry,
  });

  return registry;
}

// Module augmentations on IServiceCollection and ServiceCollection
declare module '@tsnx/hosting-abstractions' {
  interface IServiceCollection {
    /**
     * Adds and configures the TSNX Resilience Subsystem in DI.
     * Modeled after Microsoft.Extensions.Resilience builder.services.addResilience().
     */
    addResilience(
      configure?: (registry: ResilienceRegistry) => void,
    ): ResilienceRegistry;
  }
}

declare module '@tsnx/hosting' {
  interface ServiceCollection {
    /**
     * Adds and configures the TSNX Resilience Subsystem in DI.
     * Modeled after Microsoft.Extensions.Resilience builder.services.addResilience().
     */
    addResilience(
      configure?: (registry: ResilienceRegistry) => void,
    ): ResilienceRegistry;
  }
}

declare module '@tsnx/web' {
  interface WebApplication {
    /**
     * Diagnostic guard: hints user if addResilience was accidentally called on app instead of builder.services.
     */
    addResilience?(...args: any[]): never;
  }
}

// Attach prototype method to ServiceCollection
if (!(ServiceCollection.prototype as any).addResilience) {
  (ServiceCollection.prototype as any).addResilience = function (
    this: ServiceCollection,
    configure?: (registry: ResilienceRegistry) => void,
  ): ResilienceRegistry {
    return addResilience(this, configure);
  };
}

// Diagnostic stubs if called on app
if (!(WebApplication.prototype as any).addResilience) {
  (WebApplication.prototype as any).addResilience = function () {
    throw new Error(
      'Cannot call app.addResilience() after builder.build(). Services must be configured before building the application. Use builder.services.addResilience() before builder.build().',
    );
  };
}
