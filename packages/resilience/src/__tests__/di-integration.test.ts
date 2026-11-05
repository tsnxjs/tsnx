// SPDX-License-Identifier: MIT

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createToken } from '@tsnx/hosting-abstractions';
import { WebApplication, Results } from '@tsnx/web';
import { WebApplicationFactory } from '@tsnx/testing';
import '../index.js';
import { ResiliencePipeline } from '../pipeline.js';

interface PaymentResult {
  transactionId: string;
  status: string;
}

// Single standard token using createToken from @tsnx/hosting-abstractions
const PaymentPipeline = createToken<ResiliencePipeline<PaymentResult>>('PaymentPipeline');

describe('@tsnx/resilience: WebApplication & DI Integration', () => {
  function createApp(): WebApplication {
    const builder = WebApplication.createBuilder();

    // Single Canonical Registration: builder.services.addResilience()
    builder.services.addResilience((resilience) => {
      resilience.addPipeline(PaymentPipeline, (pipeline) => {
        pipeline
          .addRetry({
            maxAttempts: 2,
            initialDelayMs: 5,
            jitter: false,
          })
          .addTimeout(500);
      });
    });

    const app = builder.build();

    app.mapPost('/api/charge', async (ctx) => {
      // Type-safe DI resolution directly via ctx.services.get(PaymentPipeline)
      const pipeline = ctx.services.get(PaymentPipeline);

      let attempts = 0;
      const res = await pipeline.execute(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Bank gateway socket error');
        }
        return {
          transactionId: 'tx_998877',
          status: 'SUCCESS',
        };
      });

      return Results.json(res);
    });

    return app;
  }

  it('resolves pipeline via ctx.services.get(token) and handles retry in route', async () => {
    const factory = new WebApplicationFactory(createApp);

    try {
      const client = await factory.createClient();
      const res = await client.post('/api/charge', {});

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.transactionId, 'tx_998877');
      assert.strictEqual(json.status, 'SUCCESS');
    } finally {
      await factory.dispose();
    }
  });

  it('throws helpful diagnostic error if app.addResilience() is called on app instance', () => {
    const builder = WebApplication.createBuilder();
    const app = builder.build();

    assert.throws(
      () => {
        (app as any).addResilience();
      },
      /Cannot call app\.addResilience\(\) after builder\.build\(\)/,
    );
  });
});
