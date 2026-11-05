// SPDX-License-Identifier: MIT

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TimeoutStrategy } from '../strategies/timeout.js';
import { ResilienceContext, TimeoutRejectedError } from '../types.js';

describe('@tsnx/resilience: TimeoutStrategy', () => {
  it('returns result when action completes within timeout duration', async () => {
    const timeout = new TimeoutStrategy({ timeoutMs: 100 });
    const ctx = new ResilienceContext();

    const result = await timeout.execute(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return 'success';
    }, ctx);

    assert.strictEqual(result, 'success');
  });

  it('throws TimeoutRejectedError and aborts cancellation token when exceeded', async () => {
    let onTimeoutFired = false;
    const timeout = new TimeoutStrategy({
      timeoutMs: 30,
      onTimeout: () => {
        onTimeoutFired = true;
      },
    });

    const ctx = new ResilienceContext();
    let tokenAborted = false;

    await assert.rejects(
      async () => {
        await timeout.execute(async (innerCtx) => {
          innerCtx.cancellationToken?.addEventListener('abort', () => {
            tokenAborted = true;
          });
          await new Promise((r) => setTimeout(r, 100));
          return 'late';
        }, ctx);
      },
      (err: any) => {
        assert.ok(err instanceof TimeoutRejectedError);
        assert.strictEqual(err.timeoutMs, 30);
        return true;
      },
    );

    assert.strictEqual(onTimeoutFired, true);
    assert.strictEqual(tokenAborted, true);
  });
});
