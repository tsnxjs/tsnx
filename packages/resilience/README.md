# @tsnx/resilience

Enterprise Fault Tolerance and Resilience Pipeline for TSNX applications, modeled after Polly v8 and `Microsoft.Extensions.Resilience`.

Supports Retries with exponential backoff & jitter, Circuit Breakers with Chaos Testing controls for **TSNX Studio**, Timeouts with cancellation token propagation, and Fallbacks.

## Installation

```bash
pnpm add @tsnx/resilience
```

## Quick Start

```typescript
import { createToken } from '@tsnx/hosting-abstractions';
import { WebApplication, Results } from '@tsnx/web';
import '@tsnx/resilience';
import { ResiliencePipeline } from '@tsnx/resilience';

interface PaymentResult {
  transactionId: string;
  status: string;
}

// 1. Define type-safe DI token using standard createToken()
export const PaymentPipeline = createToken<ResiliencePipeline<PaymentResult>>('PaymentPipeline');

const builder = WebApplication.createBuilder();

// 2. Single Canonical API convention: builder.services.addResilience()
builder.services.addResilience((resilience) => {
  resilience.addPipeline(PaymentPipeline, (pipeline) => {
    pipeline
      .addFallback({
        fallbackAction: async (ctx, err) => ({
          transactionId: 'fallback_offline',
          status: 'PENDING_OFFLINE',
        }),
      })
      .addRetry({
        maxAttempts: 3,
        backoff: 'exponential',
        jitter: true,
        shouldRetry: (error) => isTransientNetworkError(error),
      })
      .addCircuitBreaker({
        failureThreshold: 0.5, // 50% failures
        samplingDurationMs: 10000,
        breakDurationMs: 30000,
        minimumThroughput: 5,
      })
      .addTimeout({
        timeoutMs: 3000,
      });
  });
});

const app = builder.build();

// 3. Resolve and execute in route handlers or services via ctx.services.get()
app.mapPost('/checkout', async (ctx) => {
  const pipeline = ctx.services.get(PaymentPipeline);

  const result = await pipeline.execute(async (resilienceCtx) => {
    return await chargePaymentGateway(resilienceCtx.cancellationToken);
  });

  return Results.json(result);
});

await app.run();
```

## Strategies

- **`addRetry(options)`**: Retry transient failures with constant, linear, or exponential backoff and randomized jitter to eliminate thundering herd storms.
- **`addCircuitBreaker(options)`**: Fast-fail requests when failure rate exceeds threshold (`Closed` &rarr; `Open` &rarr; `HalfOpen`). Includes `manualTrip()` and `manualReset()` for **TSNX Studio** chaos testing.
- **`addTimeout(options)`**: Enforce latency budgets and cancel downstream operations via standard `AbortSignal`.
- **`addFallback(options)`**: Provide graceful degradation when all strategies fail.

## License

MIT © [TSNX](https://github.com/tsnxjs/tsnx)
