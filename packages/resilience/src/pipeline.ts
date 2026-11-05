// SPDX-License-Identifier: MIT

import {
  ResilienceContext,
  ResilienceStrategy,
} from './types.js';
import { CircuitBreakerStrategy } from './strategies/circuit-breaker.js';

/**
 * An immutable resilience pipeline consisting of one or more resilience strategies executed in order.
 * Modeled after Polly v8 / Microsoft.Extensions.Resilience ResiliencePipeline.
 */
export class ResiliencePipeline<TResult = any> {
  constructor(
    public readonly strategies: readonly ResilienceStrategy[],
    public readonly name?: string,
  ) {}

  /**
   * Executes the specified asynchronous operation through all pipeline strategies in sequence.
   */
  public async execute<T = TResult>(
    action: (ctx: ResilienceContext) => Promise<T>,
    cancellationToken?: AbortSignal,
  ): Promise<T> {
    const context = new ResilienceContext(cancellationToken);

    let currentAction = action;
    for (let i = this.strategies.length - 1; i >= 0; i--) {
      const strategy = this.strategies[i];
      const next = currentAction;
      currentAction = (ctx: ResilienceContext) => strategy.execute(next, ctx);
    }

    return await currentAction(context);
  }

  /**
   * Returns all strategies registered in this pipeline.
   */
  public getStrategies(): readonly ResilienceStrategy[] {
    return this.strategies;
  }

  /**
   * Returns all circuit breaker instances in this pipeline (useful for TSNX Studio inspection/chaos tests).
   */
  public getCircuitBreakers(): readonly CircuitBreakerStrategy[] {
    return this.strategies.filter(
      (s): s is CircuitBreakerStrategy => s instanceof CircuitBreakerStrategy,
    );
  }
}
