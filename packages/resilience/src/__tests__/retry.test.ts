// SPDX-License-Identifier: MIT

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RetryStrategy } from '../strategies/retry.js';
import { ResilienceContext } from '../types.js';

describe('@tsnx/resilience: RetryStrategy', () => {
  it('returns result on first attempt if action succeeds', async () => {
    let attempts = 0;
    const retry = new RetryStrategy({ maxAttempts: 3, initialDelayMs: 10 });
    const ctx = new ResilienceContext();

    const result = await retry.execute(async () => {
      attempts++;
      return 'ok';
    }, ctx);

    assert.strictEqual(result, 'ok');
    assert.strictEqual(attempts, 1);
  });

  it('retries on failure and returns result once successful', async () => {
    let attempts = 0;
    const retryEvents: number[] = [];

    const retry = new RetryStrategy({
      maxAttempts: 3,
      initialDelayMs: 5,
      jitter: false,
      onRetry: (args) => {
        retryEvents.push(args.attempt);
      },
    });

    const ctx = new ResilienceContext();

    const result = await retry.execute(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error(`Transient error #${attempts}`);
      }
      return 'recovered';
    }, ctx);

    assert.strictEqual(result, 'recovered');
    assert.strictEqual(attempts, 3);
    assert.deepStrictEqual(retryEvents, [1, 2]);
  });

  it('re-throws last error when maxAttempts is exceeded', async () => {
    let attempts = 0;
    const retry = new RetryStrategy({ maxAttempts: 2, initialDelayMs: 5 });
    const ctx = new ResilienceContext();

    await assert.rejects(
      async () => {
        await retry.execute(async () => {
          attempts++;
          throw new Error('Persistent failure');
        }, ctx);
      },
      /Persistent failure/,
    );

    // Initial attempt (1) + 2 retries (attempts 2 & 3) = 3 total executions
    assert.strictEqual(attempts, 3);
  });

  it('respects shouldRetry filter predicate', async () => {
    let attempts = 0;
    const retry = new RetryStrategy({
      maxAttempts: 3,
      initialDelayMs: 5,
      shouldRetry: (err) => (err as Error).message.includes('TRANSIENT_NETWORK'),
    });

    const ctx = new ResilienceContext();

    await assert.rejects(
      async () => {
        await retry.execute(async () => {
          attempts++;
          throw new Error('FATAL_PERMISSION_DENIED');
        }, ctx);
      },
      /FATAL_PERMISSION_DENIED/,
    );

    assert.strictEqual(attempts, 1); // Not retried
  });

  it('calculates backoff progression with constant, linear, and exponential strategies', () => {
    const constant = new RetryStrategy({ backoff: 'constant', initialDelayMs: 100, jitter: false });
    assert.strictEqual(constant.calculateDelay(1), 100);
    assert.strictEqual(constant.calculateDelay(2), 100);

    const linear = new RetryStrategy({ backoff: 'linear', initialDelayMs: 100, jitter: false });
    assert.strictEqual(linear.calculateDelay(1), 100);
    assert.strictEqual(linear.calculateDelay(2), 200);
    assert.strictEqual(linear.calculateDelay(3), 300);

    const exp = new RetryStrategy({ backoff: 'exponential', initialDelayMs: 100, jitter: false });
    assert.strictEqual(exp.calculateDelay(1), 100);
    assert.strictEqual(exp.calculateDelay(2), 200);
    assert.strictEqual(exp.calculateDelay(3), 400);
    assert.strictEqual(exp.calculateDelay(4), 800);
  });
});
