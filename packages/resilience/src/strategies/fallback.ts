// SPDX-License-Identifier: MIT

import {
  FallbackOptions,
  ResilienceContext,
  ResilienceStrategy,
} from '../types.js';

export class FallbackStrategy<TResult = any> implements ResilienceStrategy {
  public readonly name = 'Fallback';

  constructor(public readonly options: FallbackOptions<TResult>) {}

  public async execute<T>(
    action: (ctx: ResilienceContext) => Promise<T>,
    ctx: ResilienceContext,
  ): Promise<T> {
    try {
      return await action(ctx);
    } catch (error) {
      let isHandled = true;
      if (this.options.shouldHandle) {
        isHandled = await this.options.shouldHandle(error);
      }

      if (!isHandled) {
        throw error;
      }

      if (this.options.onFallback) {
        try {
          this.options.onFallback({ error, ctx });
        } catch {
          // ignore callback error
        }
      }

      return (await this.options.fallbackAction(ctx, error)) as unknown as T;
    }
  }
}
