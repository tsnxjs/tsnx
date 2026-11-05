// SPDX-License-Identifier: MIT

/**
 * Contextual state and cancellation token passed through resilience executions.
 */
export class ResilienceContext {
  public readonly properties = new Map<string, unknown>();

  constructor(public readonly cancellationToken?: AbortSignal) {}

  public get<T>(key: string): T | undefined {
    return this.properties.get(key) as T | undefined;
  }

  public set<T>(key: string, value: T): this {
    this.properties.set(key, value);
    return this;
  }
}

/**
 * Base error class for all resilience-related errors.
 */
export class ResilienceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when an operation exceeds its configured timeout duration.
 */
export class TimeoutRejectedError extends ResilienceError {
  constructor(public readonly timeoutMs: number) {
    super(`The operation has timed out after ${timeoutMs}ms.`);
  }
}

/**
 * Represents the current operational state of a circuit breaker.
 */
export type CircuitState = 'Closed' | 'Open' | 'HalfOpen';

export const CircuitState = {
  Closed: 'Closed' as const,
  Open: 'Open' as const,
  HalfOpen: 'HalfOpen' as const,
};

/**
 * Error thrown when an execution is rejected because the circuit breaker is Open.
 */
export class BrokenCircuitError extends ResilienceError {
  constructor(
    public readonly state: CircuitState,
    message = `The circuit breaker is currently ${state} and refusing execution.`,
  ) {
    super(message);
  }
}

/**
 * Options configuring retry behavior.
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts after the initial failure.
   * Default: 3.
   */
  maxAttempts?: number;

  /**
   * Type of delay progression between attempts.
   * Default: 'exponential'.
   */
  backoff?: 'constant' | 'linear' | 'exponential';

  /**
   * Initial delay in milliseconds for the first retry.
   * Default: 100ms.
   */
  initialDelayMs?: number;

  /**
   * Maximum allowable delay between retries in milliseconds.
   * Default: 30000ms (30s).
   */
  maxDelayMs?: number;

  /**
   * Whether to apply randomized jitter to prevent thundering herd spikes.
   * Default: true.
   */
  jitter?: boolean;

  /**
   * Predicate determining if an error is transient and should trigger a retry.
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean | Promise<boolean>;

  /**
   * Callback invoked before sleeping for the next retry attempt.
   */
  onRetry?: (args: {
    error: unknown;
    attempt: number;
    delayMs: number;
    ctx: ResilienceContext;
  }) => void;
}

/**
 * Options configuring circuit breaker behavior.
 */
export interface CircuitBreakerOptions {
  /**
   * Failure ratio threshold (between 0.0 and 1.0) required to open the circuit.
   * e.g. 0.5 means 50% failures out of total executions in the sampling window.
   * Default: 0.5.
   */
  failureThreshold?: number;

  /**
   * Window duration in milliseconds over which failures are sampled.
   * Default: 10000ms (10s).
   */
  samplingDurationMs?: number;

  /**
   * Minimum throughput (number of executions) required in the window before evaluating failure threshold.
   * Default: 5.
   */
  minimumThroughput?: number;

  /**
   * Duration in milliseconds the circuit remains Open before transitioning to HalfOpen for probe trial.
   * Default: 5000ms (5s).
   */
  breakDurationMs?: number;

  /**
   * Predicate determining if an error should count as a circuit failure.
   */
  shouldHandle?: (error: unknown) => boolean | Promise<boolean>;

  /**
   * Callback invoked when the circuit transitions to Open.
   */
  onBreak?: (args: {
    durationMs: number;
    error: unknown;
    ctx: ResilienceContext;
  }) => void;

  /**
   * Callback invoked when the circuit resets back to Closed.
   */
  onReset?: () => void;

  /**
   * Callback invoked when the circuit transitions to HalfOpen.
   */
  onHalfOpen?: () => void;
}

/**
 * Options configuring operation timeout.
 */
export interface TimeoutOptions {
  /**
   * Timeout in milliseconds.
   */
  timeoutMs: number;

  /**
   * Callback invoked when the timeout threshold is exceeded.
   */
  onTimeout?: (args: { timeoutMs: number; ctx: ResilienceContext }) => void;
}

/**
 * Options configuring fallback behavior when downstream execution fails.
 */
export interface FallbackOptions<TResult> {
  /**
   * Action returning fallback data when an error occurs.
   */
  fallbackAction: (
    ctx: ResilienceContext,
    error: unknown,
  ) => Promise<TResult> | TResult;

  /**
   * Predicate determining if this error qualifies for fallback.
   * Default: handles all errors.
   */
  shouldHandle?: (error: unknown) => boolean | Promise<boolean>;

  /**
   * Callback invoked when the fallback is triggered.
   */
  onFallback?: (args: { error: unknown; ctx: ResilienceContext }) => void;
}

/**
 * Contract for individual resilience strategies (Retry, CircuitBreaker, Timeout, Fallback).
 */
export interface ResilienceStrategy {
  readonly name: string;
  execute<T>(
    action: (ctx: ResilienceContext) => Promise<T>,
    ctx: ResilienceContext,
  ): Promise<T>;
}
