// SPDX-License-Identifier: MIT

import {
  ResilienceContext,
  ResilienceStrategy,
  TimeoutOptions,
  TimeoutRejectedError,
} from '../types.js';

export class TimeoutStrategy implements ResilienceStrategy {
  public readonly name = 'Timeout';

  constructor(public readonly options: TimeoutOptions) {
    if (options.timeoutMs <= 0) {
      throw new Error(`Timeout duration must be greater than 0, got ${options.timeoutMs}`);
    }
  }

  public async execute<T>(
    action: (ctx: ResilienceContext) => Promise<T>,
    ctx: ResilienceContext,
  ): Promise<T> {
    const abortController = new AbortController();

    if (ctx.cancellationToken) {
      if (ctx.cancellationToken.aborted) {
        abortController.abort(ctx.cancellationToken.reason);
      } else {
        ctx.cancellationToken.addEventListener(
          'abort',
          () => abortController.abort(ctx.cancellationToken?.reason),
          { once: true },
        );
      }
    }

    let timer: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        abortController.abort(new TimeoutRejectedError(this.options.timeoutMs));
        if (this.options.onTimeout) {
          try {
            this.options.onTimeout({ timeoutMs: this.options.timeoutMs, ctx });
          } catch {
            // suppress callback error
          }
        }
        reject(new TimeoutRejectedError(this.options.timeoutMs));
      }, this.options.timeoutMs);
    });

    const innerContext = new ResilienceContext(abortController.signal);
    for (const [key, val] of ctx.properties) {
      innerContext.set(key, val);
    }

    try {
      return await Promise.race([action(innerContext), timeoutPromise]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }
}
