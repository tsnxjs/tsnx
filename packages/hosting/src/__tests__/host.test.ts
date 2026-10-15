import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AppHost, BackgroundService, HostedService } from '../index.js';

describe('@tsnx/hosting: AppHost & HostApplicationBuilder', () => {
  it('distinguishes start() and run() contracts', async () => {
    let serviceRunning = false;
    let serviceStopped = false;

    class TestWorker extends BackgroundService {
      async execute(stoppingToken: AbortSignal): Promise<void> {
        serviceRunning = true;
        while (!stoppingToken.aborted) {
          await new Promise((r) => setTimeout(r, 10));
        }
        serviceStopped = true;
      }
    }

    const builder = AppHost.createBuilder(['--MyKey=CustomValue']);
    builder.options.registerSignalHandlers = false;

    builder.services.addSingleton('Greeting', 'Hello TSDK');
    builder.addHostedService(() => new TestWorker());

    const app = builder.build();

    // Verify DI and Config access
    assert.equal(app.services.get('Greeting'), 'Hello TSDK');
    assert.equal(app.config.get('MyKey'), 'CustomValue');

    // 1. app.start() returns immediately while background service runs
    await app.start();
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(serviceRunning, true);
    assert.equal(serviceStopped, false);

    // 2. app.stop() stops host and background service
    await app.stop();
    assert.equal(serviceStopped, true);
  });

  it('runs app.run() and stops gracefully when stopApplication is invoked', async () => {
    const builder = AppHost.createBuilder();
    builder.options.registerSignalHandlers = false;

    let stoppedViaCallback = false;

    class AutoStopService extends BackgroundService {
      async execute(_stoppingToken: AbortSignal): Promise<void> {
        // Run briefly then trigger host shutdown from within application
        await new Promise((r) => setTimeout(r, 25));
        stoppedViaCallback = true;
      }
    }

    builder.addHostedService(() => new AutoStopService());
    const app = builder.build();

    // Schedule stop after 40ms
    setTimeout(() => {
      app.stop();
    }, 40);

    // app.run() blocks until shutdown occurs
    await app.run();

    assert.equal(stoppedViaCallback, true);
  });

  it('propagates BackgroundService execution failure to app.run()', async () => {
    const builder = AppHost.createBuilder();
    builder.options.registerSignalHandlers = false;

    class FailingWorker extends BackgroundService {
      async execute(_stoppingToken: AbortSignal): Promise<void> {
        // Run briefly then fail
        await new Promise((r) => setTimeout(r, 15));
        throw new Error('Database connection lost in worker');
      }
    }

    builder.addHostedService(() => new FailingWorker());
    const app = builder.build();

    // app.run() must reject with the error thrown inside BackgroundService.execute()
    await assert.rejects(
      () => app.run(),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes('Database connection lost in worker'));
        return true;
      },
    );
  });

  it('maintains consistent state during concurrent start() and stop() calls', async () => {
    const builder = AppHost.createBuilder();
    builder.options.registerSignalHandlers = false;

    let workerStarted = false;
    let workerStopped = false;

    class SlowStartWorker extends BackgroundService {
      override async start(signal: AbortSignal): Promise<void> {
        await new Promise((r) => setTimeout(r, 20));
        workerStarted = true;
        await super.start(signal);
      }

      override async stop(signal: AbortSignal): Promise<void> {
        workerStopped = true;
        await super.stop(signal);
      }

      async execute(_stoppingToken: AbortSignal): Promise<void> {
        await new Promise((r) => setTimeout(r, 50));
      }
    }

    builder.addHostedService(() => new SlowStartWorker());
    const app = builder.build();

    // Trigger start and stop concurrently
    const startPromise = app.start();
    const stopPromise = app.stop();

    await Promise.all([startPromise, stopPromise]);

    assert.equal(workerStarted, true);
    assert.equal(workerStopped, true);
    assert.equal(app.currentState, 'stopped');
  });

  it('honors validateOnBuild and validateScopes configured on HostApplicationBuilder', () => {
    class InvalidService {
      constructor(public missingDep: any) {}
    }

    const builder = AppHost.createBuilder();
    builder.options.registerSignalHandlers = false;
    builder.configureServiceProvider({ validateOnBuild: true });
    builder.services.addSingleton(InvalidService).toClass(InvalidService, 'MissingToken' as any);

    assert.throws(
      () => builder.build(),
      (err: any) => err.name === 'ServiceNotFoundError' || /MissingToken/.test(err.message),
    );
  });

  it('M-08: hosted service instantiated via addHostedService().toClass() is disposed by host.dispose()', async () => {
    let stopCount = 0;
    let disposeCount = 0;

    class DisposableWorker implements HostedService {
      async start() {}
      async stop() {
        stopCount++;
      }
      dispose() {
        disposeCount++;
      }
    }

    const builder = AppHost.createBuilder();
    builder.options.registerSignalHandlers = false;
    builder.services.addHostedService().toClass(DisposableWorker);
    const app = builder.build();

    await app.start();
    await app.dispose();

    assert.equal(stopCount, 1);
    assert.equal(disposeCount, 1, 'Framework-created hosted service must be disposed on host.dispose()');
  });

  it('M-08: multiple hosted services are disposed in reverse order and support async disposal', async () => {
    const events: string[] = [];

    class WorkerA implements HostedService {
      async start() {}
      async stop() {}
      async [Symbol.asyncDispose]() {
        events.push('dispose-a');
      }
    }

    class WorkerB implements HostedService {
      async start() {}
      async stop() {}
      dispose() {
        events.push('dispose-b');
      }
    }

    const builder = AppHost.createBuilder();
    builder.options.registerSignalHandlers = false;
    builder.services.addHostedService().toClass(WorkerA);
    builder.services.addHostedService().toClass(WorkerB);
    const app = builder.build();

    await app.start();
    await app.dispose();

    // Reverse order of creation: B then A
    assert.deepEqual(events, ['dispose-b', 'dispose-a']);
  });

  it('M-11: app.run() rejects when hosted service startup throws an error', async () => {
    const builder = AppHost.createBuilder();
    builder.options.registerSignalHandlers = false;

    builder.addHostedService(() => ({
      async start() {
        throw new Error('STARTUP_SENTINEL');
      },
      async stop() {},
    }));

    const app = builder.build();

    await assert.rejects(
      () => app.run(),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.equal(err.message, 'STARTUP_SENTINEL');
        return true;
      },
    );
  });

  it('M-11: app.run() rejects when startup validator fails', async () => {
    const builder = AppHost.createBuilder();
    builder.options.registerSignalHandlers = false;

    const OptionToken = Symbol('OptionToken');
    builder.services.configure(OptionToken as any)
      .validate(() => false, 'INVALID_CONFIG_SENTINEL')
      .validateOnStart();

    const app = builder.build();

    await assert.rejects(
      () => app.run(),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes('INVALID_CONFIG_SENTINEL'));
        return true;
      },
    );
  });

  it('M-12: hosted service resolved from DI via factory is disposed only once by container, not twice', async () => {
    let disposeCount = 0;

    class DiManagedWorker implements HostedService {
      async start() {}
      async stop() {}
      dispose() {
        disposeCount++;
      }
    }

    const builder = AppHost.createBuilder();
    builder.options.registerSignalHandlers = false;
    builder.services.addSingleton(DiManagedWorker).toClass(DiManagedWorker);
    builder.addHostedService((sp) => sp.get(DiManagedWorker));

    const app = builder.build();

    await app.start();
    await app.dispose();

    assert.equal(disposeCount, 1, 'Service owned by DI must only be disposed once by container');
  });

  it('M-13: startup failure in hosted service unregisters signal listeners and aborts applicationStopped', async () => {
    const initialSigint = process.listenerCount('SIGINT');
    const initialSigterm = process.listenerCount('SIGTERM');

    const builder = AppHost.createBuilder();
    // Default registers signal handlers
    builder.addHostedService(() => ({
      async start() {
        throw new Error('STARTUP_FAIL');
      },
      async stop() {},
    }));

    const app = builder.build();
    await assert.rejects(() => app.run());

    assert.equal(app.currentState, 'stopped');
    assert.equal(app.lifetime?.applicationStopped.aborted, true);
    assert.equal(process.listenerCount('SIGINT'), initialSigint, 'SIGINT listeners must return to baseline');
    assert.equal(process.listenerCount('SIGTERM'), initialSigterm, 'SIGTERM listeners must return to baseline');
  });

  it('M-13: multiple failed startup cycles (12x) do not accumulate signal listeners', async () => {
    const initialSigint = process.listenerCount('SIGINT');
    const initialSigterm = process.listenerCount('SIGTERM');

    for (let i = 0; i < 12; i++) {
      const builder = AppHost.createBuilder();
      const OptionToken = Symbol(`OptionToken-${i}`);
      builder.services.configure(OptionToken as any)
        .validate(() => false, 'FAILED_OPTIONS')
        .validateOnStart();

      const app = builder.build();
      await assert.rejects(() => app.run());

      assert.equal(app.currentState, 'stopped');
      assert.equal(app.lifetime?.applicationStopped.aborted, true);
    }

    assert.equal(process.listenerCount('SIGINT'), initialSigint, 'No SIGINT listeners must leak after 12 failed cycles');
    assert.equal(process.listenerCount('SIGTERM'), initialSigterm, 'No SIGTERM listeners must leak after 12 failed cycles');
  });

  it('M-18: in-flight shutdown is awaited before disposal proceeds', async () => {
    const builder = AppHost.createBuilder();
    const events: string[] = [];

    builder.addHostedService(() => ({
      async start() {},
      async stop() {
        events.push('stop-begins');
        await new Promise((resolve) => setTimeout(resolve, 50));
        events.push('stop-ends');
      },
    }));

    const app = builder.build();
    await app.start();

    // stopApplication initiates background shutdown
    app.lifetime!.stopApplication();

    // concurrently call dispose
    await app.dispose();

    events.push('disposed');

    assert.deepEqual(events, ['stop-begins', 'stop-ends', 'disposed']);
    assert.equal(app.lifetime!.applicationStopped.aborted, true);
  });

  it('M-19: cancellation of background service via stoppingToken during normal shutdown does not reject app.run()', async () => {
    const builder = AppHost.createBuilder();

    class CleanWorker extends BackgroundService {
      async execute(stoppingToken: AbortSignal): Promise<void> {
        await new Promise<void>((_resolve, reject) => {
          stoppingToken.addEventListener('abort', () => {
            const err = new DOMException('The operation was aborted', 'AbortError');
            reject(err);
          });
        });
      }
    }

    builder.addHostedService(() => new CleanWorker());
    const app = builder.build();

    const runPromise = app.run();

    // Give worker time to start
    await new Promise((r) => setTimeout(r, 20));

    // Stop application normally
    await app.stop();

    // app.run() must resolve cleanly without rejecting on AbortError
    await runPromise;
    assert.equal(app.currentState, 'stopped');
  });

  it('L-02: background worker failure with falsy values (0, empty string, null) rejects run()', async () => {
    for (const falsyVal of [0, '', null]) {
      const builder = AppHost.createBuilder();

      class FalsyWorker extends BackgroundService {
        async execute(): Promise<void> {
          await new Promise((r) => setTimeout(r, 10));
          throw falsyVal;
        }
      }

      builder.addHostedService(() => new FalsyWorker());
      const app = builder.build();

      try {
        await app.run();
        assert.fail(`Expected run() to reject for falsy value: ${String(falsyVal)}`);
      } catch (err) {
        assert.equal(err, falsyVal);
      }
    }
  });

  it('M-20: factory failure during build() triggers rollback disposal of earlier instances', () => {
    const builder = AppHost.createBuilder();
    let service1Disposed = false;
    let singletonDisposed = false;

    const MySingleton = Symbol('MySingleton');
    builder.services.addSingleton(MySingleton as any, () => ({
      name: 'singleton',
      dispose() {
        singletonDisposed = true;
      },
    }));

    // Service 1 resolves singleton and is disposable
    builder.addHostedService((sp) => {
      sp.get(MySingleton as any);
      return {
        async start() {},
        async stop() {},
        dispose() {
          service1Disposed = true;
        },
      };
    });

    // Service 2 throws during construction
    builder.addHostedService(() => {
      throw new Error('BUILD_FACTORY_SENTINEL');
    });

    assert.throws(
      () => builder.build(),
      (err: any) => err.message === 'BUILD_FACTORY_SENTINEL',
    );

    assert.equal(service1Disposed, true, 'Earlier hosted service must be disposed on build failure');
    assert.equal(singletonDisposed, true, 'Earlier resolved singletons in container must be disposed on build failure');
  });

  it('M-18: synchronous reentrancy from applicationStopping does not cause duplicate stop or disposal', async () => {
    const builder = AppHost.createBuilder();
    let stopCallCount = 0;
    let disposeCallCount = 0;

    let appRef: any;
    builder.addHostedService(() => ({
      async start() {},
      async stop() {
        stopCallCount++;
        await new Promise((r) => setTimeout(r, 20));
      },
      dispose() {
        disposeCallCount++;
      },
    }));

    const app = builder.build();
    appRef = app;
    app.lifetime!.applicationStopping.addEventListener('abort', () => {
      // Synchronously call dispose inside applicationStopping notification
      void appRef.dispose();
    });

    await app.start();
    await app.stop();
    await app.dispose();

    assert.equal(stopCallCount, 1, 'stop() should only execute once');
    assert.equal(disposeCallCount, 1, 'dispose() should only execute once');
    assert.equal(app.currentState, 'stopped');
  });

  it('M-20: factory failure during buildAsync() awaits async disposal in correct reverse order', async () => {
    const builder = AppHost.createBuilder();
    const order: string[] = [];

    const MySingleton = Symbol('MySingleton');
    builder.services.addSingleton(MySingleton as any, () => ({
      name: 'singleton',
      async dispose() {
        await new Promise((r) => setTimeout(r, 20));
        order.push('singleton-disposed');
      },
    }));

    // Service 1 resolves singleton and has async disposal
    builder.addHostedService((sp) => {
      sp.get(MySingleton as any);
      return {
        async start() {},
        async stop() {},
        async [Symbol.asyncDispose]() {
          await new Promise((r) => setTimeout(r, 20));
          order.push('service1-disposed');
        },
      };
    });

    // Service 2 throws during construction
    builder.addHostedService(() => {
      throw new Error('ASYNC_BUILD_FACTORY_SENTINEL');
    });

    await assert.rejects(
      () => builder.buildAsync(),
      (err: any) => err.message === 'ASYNC_BUILD_FACTORY_SENTINEL',
    );

    // Service 1 must dispose before singleton
    assert.deepEqual(order, ['service1-disposed', 'singleton-disposed']);
  });
});
