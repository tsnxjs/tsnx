import { IConfiguration } from '../config/types.js';
import { IServiceProviderRoot } from '../di/types.js';
import { HostedService } from '../hosted-services/types.js';
import { HostLifecycleCoordinator, HostApplicationLifetime } from '../lifecycle/host-lifetime.js';
import { HostApplicationBuilder } from './host-application-builder.js';
import { IHost } from './types.js';

export enum HostState {
  Created = 'created',
  Starting = 'starting',
  Started = 'started',
  Stopping = 'stopping',
  Stopped = 'stopped',
}

export class AppHost implements IHost {
  private state = HostState.Created;
  private startPromise?: Promise<void>;
  private stopPromise?: Promise<void>;
  private isDisposed = false;
  private disposePromise?: Promise<void>;
  private hasFatalExecutionError = false;
  private fatalExecutionError?: unknown;

  constructor(
    public readonly services: IServiceProviderRoot,
    public readonly config: IConfiguration,
    private readonly hostedServices: readonly HostedService[],
    private readonly coordinator: HostLifecycleCoordinator,
    private readonly startupValidators: readonly (() => void)[] = [],
    private readonly frameworkCreatedHostedServices?: ReadonlySet<HostedService>,
  ) {
    // 1. BackgroundService failure propagation:
    // If a background service fails after startup, notify the host and trigger shutdown
    for (const service of this.hostedServices) {
      if (typeof (service as any).setErrorCallback === 'function') {
        (service as any).setErrorCallback((err: unknown) => {
          this.hasFatalExecutionError = true;
          this.fatalExecutionError = err;
          this.coordinator.lifetime.stopApplication();
        });
      }
    }
  }

  static createBuilder(args: string[] = process.argv.slice(2)): HostApplicationBuilder {
    return new HostApplicationBuilder(args);
  }

  get currentState(): HostState {
    return this.state;
  }

  get lifetime(): HostApplicationLifetime {
    return this.coordinator.lifetime;
  }

  async start(): Promise<void> {
    if (this.state === HostState.Started) {
      return;
    }
    if (this.state === HostState.Starting && this.startPromise) {
      return this.startPromise;
    }
    if (this.state === HostState.Stopping || this.state === HostState.Stopped) {
      throw new Error(`Cannot start host that is ${this.state}.`);
    }

    this.state = HostState.Starting;
    this.startPromise = (async () => {
      try {
        // Run all startup validators (e.g. options validation from validateOnStart())
        for (const validator of this.startupValidators) {
          validator();
        }

        await this.coordinator.start(this.hostedServices);
        this.state = HostState.Started;
      } catch (err: unknown) {
        const wasShutdownRequested =
          this.state === HostState.Stopping ||
          this.coordinator.lifetime.applicationStopping.aborted;

        // M-13: Clean up coordinator on startup failure (unregisters SIGINT/SIGTERM listeners and aborts applicationStopped)
        try {
          await this.coordinator.stop();
        } catch {
          // Suppress coordinator stop errors so original startup error is preserved
        }

        this.state = HostState.Stopped;
        if (wasShutdownRequested && (err as any)?.name === 'AbortError') {
          return;
        }
        throw err;
      }
    })();

    return this.startPromise;
  }

  async run(): Promise<void> {
    try {
      await this.start();
    } catch (startErr: any) {
      try {
        await this.dispose();
      } catch {
        // Suppress secondary dispose errors so the original startup error is preserved
      }
      throw startErr;
    }

    // Wait until application is stopped
    await new Promise<void>((resolve) => {
      const stoppedSignal = this.coordinator.lifetime.applicationStopped;
      if (stoppedSignal.aborted) {
        resolve();
      } else {
        stoppedSignal.addEventListener('abort', () => resolve(), { once: true });
      }
    });

    await this.dispose();

    // Propagate background service failure if one occurred during execution
    if (this.hasFatalExecutionError) {
      throw this.fatalExecutionError;
    }
  }

  async stop(cancellationToken?: AbortSignal): Promise<void> {
    if (this.state === HostState.Stopped) {
      if (!this.coordinator.lifetime.applicationStopped.aborted) {
        await this.coordinator.stop(cancellationToken);
      }
      return;
    }
    if (this.stopPromise) {
      return this.stopPromise;
    }

    this.state = HostState.Stopping;
    let resolveStop!: () => void;
    let rejectStop!: (err: unknown) => void;
    this.stopPromise = new Promise<void>((resolve, reject) => {
      resolveStop = resolve;
      rejectStop = reject;
    });

    (async () => {
      try {
        await this.coordinator.stop(cancellationToken);
        resolveStop();
      } catch (err) {
        rejectStop(err);
      } finally {
        this.state = HostState.Stopped;
      }
    })();

    return this.stopPromise;
  }

  async dispose(): Promise<void> {
    if (this.isDisposed) {
      return;
    }
    if (this.disposePromise) {
      return this.disposePromise;
    }

    let resolveDispose!: () => void;
    let rejectDispose!: (err: unknown) => void;
    this.disposePromise = new Promise<void>((resolve, reject) => {
      resolveDispose = resolve;
      rejectDispose = reject;
    });

    (async () => {
      try {
        const errors: unknown[] = [];

        // 1. Ensure host is stopped first
        try {
          await this.stop();
        } catch (err) {
          errors.push(err);
        }

        // Defensive: ensure coordinator is definitely stopped and signal listeners removed
        try {
          if (!this.coordinator.lifetime.applicationStopped.aborted) {
            await this.coordinator.stop();
          }
        } catch (err) {
          errors.push(err);
        }

        // 2. Dispose framework-created hosted services in reverse order of creation
        // (Only dispose services that are NOT owned/managed by the DI container)
        const servicesToDispose = this.hostedServices.filter(
          (s) =>
            (!this.frameworkCreatedHostedServices || this.frameworkCreatedHostedServices.has(s)) &&
            !(this.services as any).isOwned?.(s),
        );

        for (const service of [...servicesToDispose].reverse()) {
          try {
            if (typeof (service as any)[Symbol.asyncDispose] === 'function') {
              await (service as any)[Symbol.asyncDispose]();
            } else if (typeof (service as any)[Symbol.dispose] === 'function') {
              (service as any)[Symbol.dispose]();
            } else if (typeof (service as any).dispose === 'function') {
              await (service as any).dispose();
            }
          } catch (err) {
            errors.push(err);
          }
        }

        // 3. Dispose DI service provider
        try {
          if (typeof (this.services as any).dispose === 'function') {
            await (this.services as any).dispose();
          }
        } catch (err) {
          errors.push(err);
        }

        this.isDisposed = true;

        if (errors.length === 1) {
          throw errors[0];
        } else if (errors.length > 1) {
          throw new AggregateError(errors, 'One or more errors occurred while disposing host');
        }
        resolveDispose();
      } catch (err) {
        rejectDispose(err);
      }
    })();

    return this.disposePromise;
  }
}
