// SPDX-License-Identifier: MIT

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CircuitBreakerStrategy } from '../strategies/circuit-breaker.js';
import { BrokenCircuitError, ResilienceContext } from '../types.js';

describe('@tsnx/resilience: CircuitBreakerStrategy', () => {
  it('starts in Closed state and executes actions normally', async () => {
    const cb = new CircuitBreakerStrategy();
    assert.strictEqual(cb.state, 'Closed');

    const ctx = new ResilienceContext();
    const res = await cb.execute(async () => 'hello', ctx);
    assert.strictEqual(res, 'hello');
  });

  it('trips to Open when failure threshold is reached', async () => {
    let breakFired = false;
    const cb = new CircuitBreakerStrategy({
      minimumThroughput: 3,
      failureThreshold: 0.5,
      breakDurationMs: 50,
      onBreak: () => {
        breakFired = true;
      },
    });

    const ctx = new ResilienceContext();

    // 1 success
    await cb.execute(async () => 'ok', ctx);

    // 2 failures
    try {
      await cb.execute(async () => {
        throw new Error('fail 1');
      }, ctx);
    } catch {
      // ignore
    }

    try {
      await cb.execute(async () => {
        throw new Error('fail 2');
      }, ctx);
    } catch {
      // ignore
    }

    // Now throughput = 3, failures = 2 (66% >= 50%) -> should trip!
    assert.strictEqual(breakFired, true);
    assert.strictEqual(cb.state, 'Open');

    // Next request should fail fast without running action
    let actionRan = false;
    await assert.rejects(
      async () => {
        await cb.execute(async () => {
          actionRan = true;
        }, ctx);
      },
      (err: any) => {
        assert.ok(err instanceof BrokenCircuitError);
        assert.strictEqual(err.state, 'Open');
        return true;
      },
    );

    assert.strictEqual(actionRan, false);
  });

  it('transitions to HalfOpen after breakDurationMs and resets to Closed on success', async () => {
    let halfOpenFired = false;
    let resetFired = false;

    const cb = new CircuitBreakerStrategy({
      breakDurationMs: 20,
      onHalfOpen: () => {
        halfOpenFired = true;
      },
      onReset: () => {
        resetFired = true;
      },
    });

    cb.manualTrip('Simulating network outage');
    assert.strictEqual(cb.state, 'Open');

    // Wait for break duration to elapse
    await new Promise((r) => setTimeout(r, 30));

    // Checking state should now transition to HalfOpen
    assert.strictEqual(cb.state, 'HalfOpen');
    assert.strictEqual(halfOpenFired, true);

    const ctx = new ResilienceContext();
    // In HalfOpen, a successful execution resets circuit to Closed
    const res = await cb.execute(async () => 'recovered-probe', ctx);
    assert.strictEqual(res, 'recovered-probe');
    assert.strictEqual(cb.state, 'Closed');
    assert.strictEqual(resetFired, true);
  });

  it('supports manualTrip and manualReset for chaos testing and TSNX Studio', async () => {
    const cb = new CircuitBreakerStrategy();
    assert.strictEqual(cb.state, 'Closed');

    cb.manualTrip('Studio Chaos Test');
    assert.strictEqual(cb.state, 'Open');

    cb.manualReset();
    assert.strictEqual(cb.state, 'Closed');
  });
});
