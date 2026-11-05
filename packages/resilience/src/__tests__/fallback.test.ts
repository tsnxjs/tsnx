// SPDX-License-Identifier: MIT

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FallbackStrategy } from '../strategies/fallback.js';
import { ResilienceContext } from '../types.js';

describe('@tsnx/resilience: FallbackStrategy', () => {
  it('returns action result when no failure occurs', async () => {
    let fallbackRan = false;
    const fallback = new FallbackStrategy<string>({
      fallbackAction: () => {
        fallbackRan = true;
        return 'fallback-value';
      },
    });

    const ctx = new ResilienceContext();
    const result = await fallback.execute(async () => 'primary-value', ctx);

    assert.strictEqual(result, 'primary-value');
    assert.strictEqual(fallbackRan, false);
  });

  it('invokes fallbackAction when execution fails', async () => {
    let fallbackCapturedError: unknown;
    const fallback = new FallbackStrategy<string>({
      fallbackAction: (_ctx, err) => {
        fallbackCapturedError = err;
        return 'cached-catalog';
      },
    });

    const ctx = new ResilienceContext();
    const result = await fallback.execute(async () => {
      throw new Error('Database disconnected');
    }, ctx);

    assert.strictEqual(result, 'cached-catalog');
    assert.strictEqual((fallbackCapturedError as Error).message, 'Database disconnected');
  });

  it('respects shouldHandle predicate and rethrows non-handled errors', async () => {
    const fallback = new FallbackStrategy<string>({
      fallbackAction: () => 'fallback-value',
      shouldHandle: (err) => (err as Error).message.includes('FALLBACK_ALLOWED'),
    });

    const ctx = new ResilienceContext();

    await assert.rejects(
      async () => {
        await fallback.execute(async () => {
          throw new Error('CRITICAL_SECURITY_VIOLATION');
        }, ctx);
      },
      /CRITICAL_SECURITY_VIOLATION/,
    );
  });
});
