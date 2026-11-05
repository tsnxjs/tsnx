// SPDX-License-Identifier: MIT

import {
  BrokenCircuitError,
  CircuitBreakerOptions,
  CircuitState,
  ResilienceContext,
  ResilienceStrategy,
} from '../types.js';

interface ExecutionRecord {
  timestamp: number;
  success: boolean;
}

export class CircuitBreakerStrategy implements ResilienceStrategy {
  public readonly name = 'CircuitBreaker';

  private currentState: CircuitState = 'Closed';
  private openedAt = 0;
  private readonly records: ExecutionRecord[] = [];

  private readonly failureThreshold: number;
  private readonly samplingDurationMs: number;
  private readonly minimumThroughput: number;
  private readonly breakDurationMs: number;

  constructor(public readonly options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 0.5;
    this.samplingDurationMs = options.samplingDurationMs ?? 10000;
    this.minimumThroughput = options.minimumThroughput ?? 5;
    this.breakDurationMs = options.breakDurationMs ?? 5000;
  }

  public get state(): CircuitState {
    if (this.currentState === 'Open') {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed >= this.breakDurationMs) {
        this.transitionToHalfOpen();
      }
    }
    return this.currentState;
  }

  public manualTrip(reason?: string): void {
    this.currentState = 'Open';
    this.openedAt = Date.now();
    if (this.options.onBreak) {
      try {
        this.options.onBreak({
          durationMs: this.breakDurationMs,
          error: new Error(reason ?? 'Circuit breaker manually tripped for testing'),
          ctx: new ResilienceContext(),
        });
      } catch {
        // ignore
      }
    }
  }

  public manualReset(): void {
    this.currentState = 'Closed';
    this.records.length = 0;
    if (this.options.onReset) {
      try {
        this.options.onReset();
      } catch {
        // ignore
      }
    }
  }

  private transitionToHalfOpen(): void {
    this.currentState = 'HalfOpen';
    if (this.options.onHalfOpen) {
      try {
        this.options.onHalfOpen();
      } catch {
        // ignore
      }
    }
  }

  private record(success: boolean): void {
    const now = Date.now();
    this.records.push({ timestamp: now, success });
    this.pruneRecords(now);
  }

  private pruneRecords(now: number): void {
    const cutoff = now - this.samplingDurationMs;
    while (this.records.length > 0 && this.records[0].timestamp < cutoff) {
      this.records.shift();
    }
  }

  private evaluateFailureRate(ctx: ResilienceContext, error: unknown): void {
    if (this.records.length < this.minimumThroughput) {
      return;
    }

    let failures = 0;
    for (const rec of this.records) {
      if (!rec.success) failures++;
    }

    const failureRate = failures / this.records.length;

    if (failureRate >= this.failureThreshold) {
      this.currentState = 'Open';
      this.openedAt = Date.now();

      if (this.options.onBreak) {
        try {
          this.options.onBreak({
            durationMs: this.breakDurationMs,
            error,
            ctx,
          });
        } catch {
          // ignore
        }
      }
    }
  }

  public async execute<T>(
    action: (ctx: ResilienceContext) => Promise<T>,
    ctx: ResilienceContext,
  ): Promise<T> {
    const state = this.state;

    if (state === 'Open') {
      throw new BrokenCircuitError('Open');
    }

    if (state === 'HalfOpen') {
      try {
        const result = await action(ctx);
        // Successful probe request resets circuit to Closed
        this.manualReset();
        return result;
      } catch (error) {
        // Failed probe request re-opens circuit
        this.currentState = 'Open';
        this.openedAt = Date.now();

        if (this.options.onBreak) {
          try {
            this.options.onBreak({
              durationMs: this.breakDurationMs,
              error,
              ctx,
            });
          } catch {
            // ignore
          }
        }

        throw new BrokenCircuitError('HalfOpen', 'Probe request in HalfOpen state failed.');
      }
    }

    // State is Closed
    try {
      const result = await action(ctx);
      this.record(true);
      return result;
    } catch (error) {
      let isHandled = true;
      if (this.options.shouldHandle) {
        isHandled = await this.options.shouldHandle(error);
      }

      if (isHandled) {
        this.record(false);
        this.evaluateFailureRate(ctx, error);
      }

      throw error;
    }
  }
}
