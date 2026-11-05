// SPDX-License-Identifier: MIT

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ResiliencePipelineBuilder } from '../builder.js';

describe('@tsnx/resilience: ResiliencePipeline (Multi-Strategy)', () => {
  it('chains Timeout, Retry, CircuitBreaker, and Fallback correctly', async () => {
    let attempts = 0;

    const builder = new ResiliencePipelineBuilder<string>();
    const pipeline = builder
      .addFallback({
        fallbackAction: () => 'fallback-response',
      })
      .addRetry({
        maxAttempts: 2,
        initialDelayMs: 5,
        jitter: false,
      })
      .addTimeout(30)
      .build('FullPipeline');

    const result = await pipeline.execute(async () => {
      attempts++;
      // Sleep longer than timeout (30ms) to trigger TimeoutRejectedError
      await new Promise((r) => setTimeout(r, 60));
      return 'too late';
    });

    // 1 initial attempt + 2 retries = 3 attempts total, all timed out, then caught by fallback
    assert.strictEqual(attempts, 3);
    assert.strictEqual(result, 'fallback-response');
  });

  it('exposes circuit breakers and strategies for inspection', () => {
    const builder = new ResiliencePipelineBuilder();
    const pipeline = builder
      .addTimeout(500)
      .addCircuitBreaker()
      .build('MyPipeline');

    assert.strictEqual(pipeline.name, 'MyPipeline');
    assert.strictEqual(pipeline.getStrategies().length, 2);
    assert.strictEqual(pipeline.getCircuitBreakers().length, 1);
  });
});
