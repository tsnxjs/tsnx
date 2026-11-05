// SPDX-License-Identifier: MIT

import {
  ResilienceContext,
  ResilienceStrategy,
  RetryOptions,
} from '../types.js';

export class RetryStrategy implements ResilienceStrategy {
  public readonly name = 'Retry';
  private readonly maxAttempts: number;
  private readonly backoff: 'constant' | 'linear' | 'exponential';
  private readonly initialDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly jitter: boolean;

  constructor(public readonly options: RetryOptions = {}) {
    this.maxAttempts = options.maxAttempts ?? 3;
    this.backoff = options.backoff ?? 'exponential';
    this.initialDelayMs = options.initialDelayMs ?? 100;
    this.maxDelayMs = options.maxDelayMs ?? 30000;
    this.jitter = options.jitter ?? true;
  }

  public calculateDelay(attempt: number): number {
    let baseDelay: number;

    switch (this.backoff) {
      case 'constant':
        baseDelay = this.initialDelayMs;
        break;
      case 'linear':
        baseDelay = this.initialDelayMs * attempt;
        break;
      case 'exponential':
      default:
        baseDelay = this.initialDelayMs * Math.pow(2, attempt - 1);
        break;
    }

    baseDelay = Math.min(baseDelay, this.maxDelayMs);

    if (this.jitter) {
      // Full jitter: between 50% and 100% of computed baseDelay to avoid cluster retry waves
      const factor = 0.5 + Math.random() * 0.5;
      return Math.max(1, Math.floor(baseDelay * factor));
    }

    return baseDelay;
  }

  public async execute<T>(
    action: (ctx: ResilienceContext) => Promise<T>,
    ctx: ResilienceContext,
  ): Promise<T> {
    let attempt = 0;

    while (true) {
      try {
        if (ctx.cancellationToken?.aborted) {
          throw ctx.cancellationToken.reason;
        }
        return await action(ctx);
      } catch (error) {
        attempt++;

        if (attempt > this.maxAttempts) {
          throw error;
        }

        if (this.options.shouldRetry) {
          const should = await this.options.shouldRetry(error, attempt);
          if (!should) {
            throw error;
          }
        }

        if (ctx.cancellationToken?.aborted) {
          throw ctx.cancellationToken.reason;
        }

        const delayMs = this.calculateDelay(attempt);

        if (this.options.onRetry) {
          try {
            this.options.onRetry({
              error,
              attempt,
              delayMs,
              ctx,
            });
          } catch {
            // suppress callback error
          }
        }

        await this.sleep(delayMs, ctx.cancellationToken);
      }
    }
  }

  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        return reject(signal.reason);
      }

      let timer: ReturnType<typeof setTimeout> | undefined;

      const onAbort = () => {
        if (timer) clearTimeout(timer);
        reject(signal?.reason);
      };

      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true });
      }

      timer = setTimeout(() => {
        if (signal) {
          signal.removeEventListener('abort', onAbort);
        }
        resolve();
      }, ms);
    });
  }
}
