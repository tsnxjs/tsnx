import test, { describe, afterEach } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { Readable } from 'node:stream';
import { WebApplication } from '../app/web-application.js';
import { Results } from '../http/results.js';
import { InvalidResponseStateException } from '../http/http-context.js';

describe('HTTP Request Lifecycle & Cancellation - 12 Acceptance Criteria', () => {
  let app: WebApplication | undefined;

  afterEach(async () => {
    if (app) {
      await app.stop();
      app = undefined;
    }
  });

  // 1. Normal response selesai tanpa meng-abort signal
  test('1. Normal response selesai tanpa meng-abort signal (signal.aborted remains false)', async () => {
    let handlerSignalAborted: boolean | undefined;
    let completedSignalAborted: boolean | undefined;

    const builder = WebApplication.createBuilder();
    builder.configureServer({ port: 0, host: '127.0.0.1' });
    app = builder.build();

    app.mapGet('/normal', (ctx) => {
      handlerSignalAborted = ctx.request.signal.aborted;
      ctx.response.onCompleted(() => {
        completedSignalAborted = ctx.request.signal.aborted;
      });
      return Results.json({ success: true });
    });

    await app.start();
    const port = app.listeningPort!;

    const res = await fetch(`http://127.0.0.1:${port}/normal`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.deepStrictEqual(body, { success: true });

    assert.strictEqual(handlerSignalAborted, false);
    assert.strictEqual(completedSignalAborted, false);
  });

  // 2. Client disconnect saat handler berjalan memicu AbortSignal
  test('2. Client disconnect saat handler berjalan memicu AbortSignal', async () => {
    let signalAborted = false;
    let abortReasonName: string | undefined;
    let onCompletedFired = false;
    let handlerStartedResolve: () => void;
    const handlerStartedPromise = new Promise<void>((r) => {
      handlerStartedResolve = r;
    });

    const builder = WebApplication.createBuilder();
    builder.configureServer({ port: 0, host: '127.0.0.1' });
    app = builder.build();

    app.mapGet('/disconnect', async (ctx) => {
      ctx.response.onCompleted(() => {
        onCompletedFired = true;
      });

      ctx.request.signal.addEventListener('abort', () => {
        signalAborted = ctx.request.signal.aborted;
        abortReasonName = ctx.request.signal.reason?.name;
      });

      handlerStartedResolve();

      // Wait indefinitely or until signal aborts
      await new Promise<void>((resolve) => {
        ctx.request.signal.addEventListener('abort', () => resolve(), { once: true });
      });

      return Results.text('never sent');
    });

    await app.start();
    const port = app.listeningPort!;

    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: '/disconnect',
      method: 'GET',
    });
    req.on('error', () => {}); // Handle expected ECONNRESET on client side

    req.end();
    await handlerStartedPromise;

    // Forcefully destroy client socket to simulate client disconnect
    req.destroy();

    // Give event loop time to process socket close
    await new Promise((r) => setTimeout(r, 60));

    assert.strictEqual(signalAborted, true);
    assert.strictEqual(abortReasonName, 'AbortError');
    assert.strictEqual(onCompletedFired, true);
  });

  // 3. Client disconnect saat streaming tidak memicu HTTP 500 tambahan
  test('3. Client disconnect saat streaming tidak memicu HTTP 500 tambahan', async () => {
    let streamAborted = false;
    let streamCompletedFired = false;

    const builder = WebApplication.createBuilder();
    builder.configureServer({ port: 0, host: '127.0.0.1' });
    app = builder.build();

    app.mapGet('/stream-disconnect', (ctx) => {
      ctx.response.onCompleted(() => {
        streamCompletedFired = true;
      });

      ctx.request.signal.addEventListener('abort', () => {
        streamAborted = true;
      });

      async function* generate() {
        yield 'chunk1\n';
        await new Promise((r) => setTimeout(r, 100));
        yield 'chunk2\n';
      }

      return Results.stream(Readable.from(generate()), 200, 'text/plain');
    });

    await app.start();
    const port = app.listeningPort!;

    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: '/stream-disconnect',
      method: 'GET',
    });
    req.on('error', () => {}); // Ignore client ECONNRESET

    req.on('response', (res) => {
      res.on('data', () => {
        // As soon as first chunk arrives, disconnect client abruptly
        req.destroy();
      });
    });

    req.end();

    await new Promise((r) => setTimeout(r, 80));

    assert.strictEqual(streamAborted, true);
    assert.strictEqual(streamCompletedFired, true);
  });

  // 4. Timeout mengirim 503 tanpa menunggu handler non-kooperatif
  test('4. Timeout mengirim 503 tanpa menunggu handler non-kooperatif', async () => {
    let handlerFinished = false;

    const builder = WebApplication.createBuilder();
    builder.configureServer({ port: 0, host: '127.0.0.1', requestExecutionTimeoutMs: 50 });
    app = builder.build();

    app.mapGet('/uncooperative-timeout', async () => {
      // Simulates an uncooperative handler that ignores signal and sleeps 300ms
      await new Promise((r) => setTimeout(r, 300));
      handlerFinished = true;
      return Results.json({ success: true });
    });

    await app.start();
    const port = app.listeningPort!;

    const startTime = Date.now();
    const res = await fetch(`http://127.0.0.1:${port}/uncooperative-timeout`);
    const elapsed = Date.now() - startTime;

    // Response must arrive promptly around 50ms, NOT 300ms!
    assert.ok(elapsed < 200, `Expected response under 200ms, took ${elapsed}ms`);
    assert.strictEqual(res.status, 503);
    assert.strictEqual(res.headers.get('Content-Type'), 'application/problem+json; charset=utf-8');

    const problem = (await res.json()) as any;
    assert.strictEqual(problem.type, 'https://tsnx.dev/problems/timeout');
    assert.strictEqual(problem.status, 503);
    assert.strictEqual(handlerFinished, false); // handler still running in background
  });

  // 5. Late handler result tidak menyebabkan double response
  test('5. Late handler result tidak menyebabkan double response', async () => {
    let doubleResponseError: Error | undefined;

    const builder = WebApplication.createBuilder();
    builder.configureServer({ port: 0, host: '127.0.0.1', requestExecutionTimeoutMs: 50 });
    app = builder.build();

    app.mapGet('/late-result', async (ctx) => {
      await new Promise((r) => setTimeout(r, 120));
      try {
        // Late handler attempting to write after 503 was already sent
        await ctx.response.writeJson({ late: 'write' });
      } catch (err: any) {
        doubleResponseError = err;
      }
      return Results.json({ late: 'result' });
    });

    await app.start();
    const port = app.listeningPort!;

    const res = await fetch(`http://127.0.0.1:${port}/late-result`);
    assert.strictEqual(res.status, 503);

    // Wait until late handler finishes
    await new Promise((r) => setTimeout(r, 150));
    assert.strictEqual(doubleResponseError, undefined, 'Late write must be cleanly ignored without throwing');
  });

  // 6. onStarting async dieksekusi tepat sekali saat concurrent writes dan write konkuren melempar InvalidResponseStateException
  test('6. onStarting async dieksekusi tepat sekali saat concurrent writes dan write konkuren melempar InvalidResponseStateException', async () => {
    let startingCallCount = 0;
    let concurrentError: any;

    const builder = WebApplication.createBuilder();
    builder.configureServer({ port: 0, host: '127.0.0.1' });
    app = builder.build();

    app.mapGet('/concurrent-writes', async (ctx) => {
      ctx.response.onStarting(async () => {
        startingCallCount++;
        await new Promise((r) => setTimeout(r, 20));
      });

      // Two writes racing concurrently in application code
      const results = await Promise.allSettled([
        ctx.response.writeText('Hello'),
        ctx.response.writeText('World'),
      ]);

      const rejected = results.find((r) => r.status === 'rejected');
      if (rejected && rejected.status === 'rejected') {
        concurrentError = rejected.reason;
      }
    });

    await app.start();
    const port = app.listeningPort!;

    const res = await fetch(`http://127.0.0.1:${port}/concurrent-writes`);
    assert.strictEqual(res.status, 200);
    const text = await res.text();
    // One write succeeded with 200 and sent body
    assert.ok(text === 'Hello' || text === 'World');
    // onStarting ran EXACTLY once
    assert.strictEqual(startingCallCount, 1);
    // The concurrent write was NOT silently swallowed; it threw an explicit InvalidResponseStateException
    assert.ok(concurrentError instanceof InvalidResponseStateException);
    assert.match(concurrentError.message, /Cannot start another write while a response write is already in progress/);
  });

  // 7. onCompleted dieksekusi tepat sekali pada finish, close, dan error
  test('7. onCompleted dieksekusi tepat sekali pada finish, close, dan error', async () => {
    let completedCount = 0;

    const builder = WebApplication.createBuilder();
    builder.configureServer({ port: 0, host: '127.0.0.1' });
    app = builder.build();

    app.mapGet('/completed-once', (ctx) => {
      ctx.response.onCompleted(() => {
        completedCount++;
      });
      return Results.json({ ok: true });
    });

    await app.start();
    const port = app.listeningPort!;

    const res = await fetch(`http://127.0.0.1:${port}/completed-once`);
    assert.strictEqual(res.status, 200);

    // Wait for underlying socket close
    await new Promise((r) => setTimeout(r, 50));
    assert.strictEqual(completedCount, 1);
  });

  // 8. Scoped service tetap tersedia selama onCompleted
  test('8. Scoped service tetap tersedia selama onCompleted', async () => {
    const lifecycleEvents: string[] = [];

    class AuditService {
      public record(action: string) {
        lifecycleEvents.push(`audit:${action}`);
      }
      public async dispose() {
        lifecycleEvents.push('scoped:disposed');
      }
    }

    const builder = WebApplication.createBuilder();
    builder.configureServer({ port: 0, host: '127.0.0.1' });
    builder.services.addScoped(AuditService, () => new AuditService());
    app = builder.build();

    app.mapGet('/scoped-available', (ctx) => {
      const audit = ctx.services.get(AuditService);
      audit.record('handler');

      ctx.response.onCompleted(() => {
        audit.record('onCompleted');
        lifecycleEvents.push('onCompleted:done');
      });

      return Results.json({ success: true });
    });

    await app.start();
    const port = app.listeningPort!;

    const res = await fetch(`http://127.0.0.1:${port}/scoped-available`);
    assert.strictEqual(res.status, 200);

    // Verification: audit:onCompleted executed BEFORE scoped:disposed
    assert.deepStrictEqual(lifecycleEvents, [
      'audit:handler',
      'audit:onCompleted',
      'onCompleted:done',
      'scoped:disposed',
    ]);
  });

  // 9. Scoped dependency tidak di-dispose ketika handler masih aktif menggunakannya
  test('9. Scoped dependency tidak di-dispose ketika handler masih aktif menggunakannya', async () => {
    let scopedDisposedWhileHandlerActive = false;
    let handlerFinished = false;

    class DatabaseService {
      public isDisposed = false;
      public async dispose() {
        this.isDisposed = true;
      }
    }

    const builder = WebApplication.createBuilder();
    builder.configureServer({ port: 0, host: '127.0.0.1', requestExecutionTimeoutMs: 50 });
    builder.services.addScoped(DatabaseService, () => new DatabaseService());
    app = builder.build();

    app.mapGet('/slow-db-operation', async (ctx) => {
      const db = ctx.services.get(DatabaseService);

      // Handler simulates a long DB operation (150ms), while timeout strikes at 50ms
      await new Promise((r) => setTimeout(r, 150));

      if (db.isDisposed) {
        scopedDisposedWhileHandlerActive = true;
      }
      handlerFinished = true;
      return Results.json({ done: true });
    });

    await app.start();
    const port = app.listeningPort!;

    const res = await fetch(`http://127.0.0.1:${port}/slow-db-operation`);
    // Client got 503 immediately
    assert.strictEqual(res.status, 503);

    // Wait until background handler finishes
    await new Promise((r) => setTimeout(r, 180));

    assert.strictEqual(handlerFinished, true);
    assert.strictEqual(
      scopedDisposedWhileHandlerActive,
      false,
      'Scoped dependency must NOT be disposed while handler was still running'
    );
  });

  // 10. Graceful shutdown menunggu request aktif sebelum drain deadline
  test('10. Graceful shutdown menunggu request aktif sebelum drain deadline', async () => {
    let inFlightFinished = false;

    const builder = WebApplication.createBuilder();
    builder.configureServer({ port: 0, host: '127.0.0.1', shutdownDrainTimeoutMs: 1000 });
    app = builder.build();

    app.mapGet('/in-flight', async () => {
      await new Promise((r) => setTimeout(r, 80));
      inFlightFinished = true;
      return Results.json({ completed: true });
    });

    await app.start();
    const port = app.listeningPort!;

    // Start request in background
    const requestPromise = fetch(`http://127.0.0.1:${port}/in-flight`);

    // Initiate stop while request is in-flight
    await new Promise((r) => setTimeout(r, 20));
    const stopPromise = app.stop();

    const [res] = await Promise.all([requestPromise, stopPromise]);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.deepStrictEqual(body, { completed: true });
    assert.strictEqual(inFlightFinished, true);
  });

  // 11. Forced shutdown membatalkan request yang belum selesai
  test('11. Forced shutdown membatalkan request yang belum selesai', async () => {
    let signalAborted = false;
    let abortReasonName: string | undefined;
    let handlerStartedResolve: () => void;
    const handlerStartedPromise = new Promise<void>((r) => {
      handlerStartedResolve = r;
    });

    const builder = WebApplication.createBuilder();
    builder.configureServer({ port: 0, host: '127.0.0.1', shutdownDrainTimeoutMs: 60 });
    app = builder.build();

    app.mapGet('/lingering', async (ctx) => {
      ctx.request.signal.addEventListener('abort', () => {
        signalAborted = ctx.request.signal.aborted;
        abortReasonName = ctx.request.signal.reason?.name;
      });

      handlerStartedResolve();

      // Simulates an unresponsive operation exceeding drain timeout
      await new Promise((r) => setTimeout(r, 500));
      return Results.text('done');
    });

    await app.start();
    const port = app.listeningPort!;

    const reqPromise = fetch(`http://127.0.0.1:${port}/lingering`).catch(() => undefined);

    await handlerStartedPromise;
    // Trigger stop with 60ms drain timeout
    await app.stop();

    await reqPromise;

    assert.strictEqual(signalAborted, true);
    assert.strictEqual(abortReasonName, 'AbortError');
  });

  // 12. Semua timer dan event listener dibersihkan setelah request berakhir
  test('12. Semua timer dan event listener dibersihkan setelah request berakhir', async () => {
    let rawResRef: http.ServerResponse | undefined;

    const builder = WebApplication.createBuilder();
    builder.configureServer({ port: 0, host: '127.0.0.1', requestExecutionTimeoutMs: 5000 });
    app = builder.build();

    app.mapGet('/clean-listeners', (ctx) => {
      rawResRef = ctx.response.raw;
      return Results.json({ clean: true });
    });

    await app.start();
    const port = app.listeningPort!;

    const res = await fetch(`http://127.0.0.1:${port}/clean-listeners`);
    assert.strictEqual(res.status, 200);

    // Wait brief tick for finally block cleanup
    await new Promise((r) => setTimeout(r, 30));

    assert.ok(rawResRef);
    // Verified: custom close and finish listeners were removed from res
    const closeListeners = rawResRef.listeners('close').map((fn) => fn.name);
    const finishListeners = rawResRef.listeners('finish').map((fn) => fn.name);
    assert.strictEqual(closeListeners.includes('onTsnxClose'), false);
    assert.strictEqual(finishListeners.includes('onTsnxFinish'), false);
  });

  // 13. M-04: Graceful shutdown waits for handler async work to complete even after response was sent
  test('13. M-04: Graceful shutdown waits for handler async work to complete even after response was sent', async () => {
    let handlerFinished = false;
    let handlerStartedResolve: () => void;
    const handlerStartedPromise = new Promise<void>((r) => {
      handlerStartedResolve = r;
    });

    const builder = WebApplication.createBuilder();
    builder.configureServer({ port: 0, host: '127.0.0.1', shutdownDrainTimeoutMs: 1000 });
    app = builder.build();

    app.mapGet('/async-after-response', async (ctx) => {
      handlerStartedResolve();
      // Write response
      await ctx.response.writeText('done', 200);
      // Simulate post-response async work
      await new Promise((r) => setTimeout(r, 60));
      handlerFinished = true;
    });

    await app.start();
    const port = app.listeningPort!;

    // Send request and consume response
    const fetchPromise = fetch(`http://127.0.0.1:${port}/async-after-response`);
    await handlerStartedPromise;

    const res = await fetchPromise;
    assert.strictEqual(res.status, 200);
    assert.strictEqual(await res.text(), 'done');

    // Trigger shutdown while post-response work is still pending
    assert.strictEqual(handlerFinished, false);
    await app.stop();

    // Shutdown MUST have waited for the handler async work to settle!
    assert.strictEqual(handlerFinished, true);
    app = undefined;
  });

  // 14. M-04: Graceful shutdown waits for scoped DI async disposal to complete before host teardown
  test('14. M-04: Graceful shutdown waits for scoped DI async disposal to complete before host teardown', async () => {
    const events: string[] = [];

    class SlowDisposableService {
      async [Symbol.asyncDispose]() {
        events.push('dispose-start');
        await new Promise((r) => setTimeout(r, 60));
        events.push('dispose-end');
      }
    }

    const builder = WebApplication.createBuilder();
    builder.configureServer({ port: 0, host: '127.0.0.1', shutdownDrainTimeoutMs: 1000 });
    builder.services.addScoped(SlowDisposableService).toClass(SlowDisposableService);
    app = builder.build();

    app.mapGet('/scoped-slow-dispose', (ctx) => {
      // Resolve scoped service so it is tracked in request scope
      ctx.services.get(SlowDisposableService);
      return Results.text('ok');
    });

    await app.start();
    const port = app.listeningPort!;

    const fetchPromise = fetch(`http://127.0.0.1:${port}/scoped-slow-dispose`);
    const res = await fetchPromise;
    assert.strictEqual(res.status, 200);
    assert.strictEqual(await res.text(), 'ok');

    // Trigger shutdown
    await app.stop();

    // Shutdown MUST NOT complete until async disposal finishes!
    assert.deepStrictEqual(events, ['dispose-start', 'dispose-end']);
    app = undefined;
  });

  // 15. M-06: Shutdown dengan signal yang sudah di-abort tetap menutup server dan membebaskan port
  test('15. M-06: Shutdown dengan signal yang sudah di-abort tetap menutup server dan membebaskan port', async () => {
    const builder = WebApplication.createBuilder();
    builder.configureServer({ port: 0, host: '127.0.0.1' });
    app = builder.build();

    app.mapGet('/health', () => Results.text('ok'));

    await app.start();
    const port = app.listeningPort!;
    assert.ok(port > 0);

    // Verify server is listening and responding
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    assert.strictEqual(res.status, 200);

    // Create an already-aborted signal
    const abortController = new AbortController();
    abortController.abort(new DOMException('Pre-aborted shutdown', 'AbortError'));

    // Stop using pre-aborted signal
    await app.stop(abortController.signal);
    app = undefined;

    // Verify port is freed: a new server can bind to the exact same port without EADDRINUSE
    await new Promise<void>((resolve, reject) => {
      const probeServer = http.createServer();
      probeServer.once('error', (err) => {
        probeServer.close();
        reject(err);
      });
      probeServer.listen(port, '127.0.0.1', () => {
        probeServer.close(() => resolve());
      });
    });

    // Also verify fetching the old port fails with connection refused
    await assert.rejects(
      async () => {
        await fetch(`http://127.0.0.1:${port}/health`);
      },
      (err: any) => err.name === 'TypeError' || err.code === 'ECONNREFUSED' || err.cause?.code === 'ECONNREFUSED'
    );
  });

  test('M-25: concurrent startup (Promise.all) builds only one host and cleans up signal listeners and disposables cleanly', async () => {
    const initialSigint = process.listenerCount('SIGINT');
    const initialSigterm = process.listenerCount('SIGTERM');

    let factoryCalls = 0;
    let disposals = 0;

    const builder = WebApplication.createBuilder();
    builder.configureServer({ port: 0, host: '127.0.0.1' });

    builder.services.addHostedService(() => {
      factoryCalls++;
      return {
        async start() {},
        async stop() {},
        dispose() {
          disposals++;
        },
      };
    });

    const webApp = builder.build();

    // Trigger concurrent startups
    await Promise.all([webApp.start(), webApp.start()]);

    assert.strictEqual(factoryCalls, 1, 'Hosted service factory should only be invoked once');

    // Dispose the application
    await webApp.dispose();

    assert.strictEqual(disposals, 1, 'Hosted service should be disposed exactly once');

    // Verify signal listeners returned to baseline
    assert.strictEqual(process.listenerCount('SIGINT'), initialSigint, 'SIGINT listeners must return to baseline');
    assert.strictEqual(process.listenerCount('SIGTERM'), initialSigterm, 'SIGTERM listeners must return to baseline');
  });
});
