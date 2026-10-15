import { HostedService } from '../hosted-services/types.js';
import { ILogger } from '../logging/types.js';
import { IHostApplicationLifetime } from './types.js';

export interface HostLifetimeOptions {
  shutdownTimeoutMs?: number;
  registerSignalHandlers?: boolean;
}

export class HostApplicationLifetime implements IHostApplicationLifetime {
  private readonly startedCts = new AbortController();
  private readonly stoppingCts = new AbortController();
  private readonly stoppedCts = new AbortController();

  private onStopRequestedCallback?: () => void;

  get applicationStarted(): AbortSignal {
    return this.startedCts.signal;
  }

  get applicationStopping(): AbortSignal {
    return this.stoppingCts.signal;
  }

  get applicationStopped(): AbortSignal {
    return this.stoppedCts.signal;
  }

  notifyStarted(): void {
    this.startedCts.abort();
  }

  notifyStopping(): void {
    if (!this.stoppingCts.signal.aborted) {
      this.stoppingCts.abort();
    }
  }

  notifyStopped(): void {
    if (!this.stoppedCts.signal.aborted) {
      this.stoppedCts.abort();
    }
  }

  setStopCallback(callback: () => void): void {
    this.onStopRequestedCallback = callback;
  }

  stopApplication(): void {
    if (this.onStopRequestedCallback) {
      this.onStopRequestedCallback();
    }
  }
}

export class HostLifecycleCoordinator {
  private readonly startedServices: HostedService[] = [];
  private isStopping = false;
  private isStopped = false;
  private startupCts?: AbortController;
  private activeStartPromise?: Promise<void>;
  private activeStopPromise?: Promise<void>;
  private readonly shutdownTimeoutMs: number;
  private signalListeners: Array<{ signal: NodeJS.Signals; listener: () => void }> = [];

  constructor(
    public readonly lifetime: HostApplicationLifetime,
    private readonly logger?: ILogger,
    options: HostLifetimeOptions = {},
  ) {
    this.shutdownTimeoutMs = options.shutdownTimeoutMs ?? 30000;

    if (options.registerSignalHandlers !== false) {
      this.registerSignals();
    }

    this.lifetime.setStopCallback(() => {
      this.stop().catch((err) => {
        this.logger?.error('Error during shutdown:', err);
      });
    });
  }

  private registerSignals(): void {
    const handleSignal = (sig: NodeJS.Signals) => {
      this.logger?.info(`Received signal ${sig}, initiating graceful shutdown...`);
      this.stop().catch((err) => {
        this.logger?.error(`Error during ${sig} shutdown:`, err);
      });
    };

    const sigintListener = () => handleSignal('SIGINT');
    const sigtermListener = () => handleSignal('SIGTERM');

    process.once('SIGINT', sigintListener);
    process.once('SIGTERM', sigtermListener);

    this.signalListeners.push(
      { signal: 'SIGINT', listener: sigintListener },
      { signal: 'SIGTERM', listener: sigtermListener },
    );
  }

  unregisterSignals(): void {
    for (const { signal, listener } of this.signalListeners) {
      process.removeListener(signal, listener);
    }
    this.signalListeners = [];
  }

  async start(services: readonly HostedService[]): Promise<void> {
    if (this.isStopping || this.isStopped) {
      throw new DOMException('Cannot start host: host is stopping or stopped', 'AbortError');
    }

    this.startupCts = new AbortController();
    const startupSignal = this.startupCts.signal;

    const startTask = (async () => {
      for (let i = 0; i < services.length; i++) {
        const service = services[i];

        if (this.isStopping || this.isStopped || startupSignal.aborted) {
          await this.rollbackStartedServices();
          throw new DOMException('Startup aborted: host is stopping', 'AbortError');
        }

        try {
          await service.start(startupSignal);
        } catch (err: unknown) {
          this.logger?.error(
            `Hosted service at index ${i} failed to start. Rolling back previously started services...`,
            err,
          );
          await this.rollbackStartedServices();
          throw err;
        }

        if (this.isStopping || this.isStopped || startupSignal.aborted) {
          this.startedServices.push(service);
          await this.rollbackStartedServices();
          throw new DOMException('Startup aborted: host is stopping', 'AbortError');
        }

        this.startedServices.push(service);
      }

      this.lifetime.notifyStarted();
    })();

    this.activeStartPromise = startTask;
    try {
      await startTask;
    } finally {
      this.activeStartPromise = undefined;
      this.startupCts = undefined;
    }
  }

  private async rollbackStartedServices(): Promise<void> {
    const rollbackCts = new AbortController();
    let timeoutTimer: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<'timeout'>((resolve) => {
      timeoutTimer = setTimeout(() => {
        rollbackCts.abort();
        resolve('timeout');
      }, this.shutdownTimeoutMs);
    });

    const rollbackTask = (async () => {
      const servicesToStop = [...this.startedServices].reverse();
      for (const service of servicesToStop) {
        try {
          await service.stop(rollbackCts.signal);
        } catch (stopErr: unknown) {
          this.logger?.error('Error stopping service during startup rollback:', stopErr);
        }
      }
    })();

    try {
      await Promise.race([rollbackTask, timeoutPromise]);
    } finally {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      this.startedServices.length = 0;
    }
  }

  async stop(cancellationToken?: AbortSignal): Promise<void> {
    if (this.isStopped) {
      return;
    }
    if (this.activeStopPromise) {
      return this.activeStopPromise;
    }
    this.isStopping = true;

    let resolvePromise!: () => void;
    let rejectPromise!: (err: unknown) => void;
    this.activeStopPromise = new Promise<void>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    (async () => {
      try {
        this.lifetime.notifyStopping();

        const shutdownCts = new AbortController();
        let timeoutTimer: NodeJS.Timeout | undefined;

        let onExternalCancel: (() => void) | undefined;
        if (cancellationToken?.aborted) {
          shutdownCts.abort(cancellationToken.reason);
        } else if (cancellationToken) {
          onExternalCancel = () => shutdownCts.abort(cancellationToken.reason);
          cancellationToken.addEventListener(
            'abort',
            onExternalCancel,
            { once: true },
          );
        }

        // 1. Abort in-flight startup immediately if in progress!
        if (this.startupCts && !this.startupCts.signal.aborted) {
          this.startupCts.abort(
            cancellationToken?.reason ?? new DOMException('Shutdown initiated during startup', 'AbortError'),
          );
        }

        // Hard limit: Timeout promise enforces absolute deadline even if service ignores signal
        const timeoutPromise = new Promise<'timeout'>((resolve) => {
          if (shutdownCts.signal.aborted) {
            return resolve('timeout');
          }
          shutdownCts.signal.addEventListener('abort', () => resolve('timeout'), { once: true });
          timeoutTimer = setTimeout(() => {
            this.logger?.warn(
              `Shutdown timed out after ${this.shutdownTimeoutMs}ms. Forcing shutdown cancellation.`,
            );
            shutdownCts.abort();
            resolve('timeout');
          }, this.shutdownTimeoutMs);
        });

        const stopServicesTask = (async () => {
          // If startup is in flight, wait for it to settle or be cancelled
          if (this.activeStartPromise) {
            try {
              await this.activeStartPromise;
            } catch {
              // Expected startup cancellation error
            }
          }

          const servicesToStop = [...this.startedServices].reverse();
          for (const service of servicesToStop) {
            try {
              await service.stop(shutdownCts.signal);
            } catch (err: unknown) {
              this.logger?.error('Error stopping hosted service:', err);
            }
          }
        })();

        try {
          const raceResult = await Promise.race([stopServicesTask, timeoutPromise]);
          if (raceResult === 'timeout') {
            this.logger?.warn('Shutdown forced: one or more services failed to stop before timeout.');
          }
        } finally {
          if (timeoutTimer) clearTimeout(timeoutTimer);
          if (cancellationToken && onExternalCancel) {
            cancellationToken.removeEventListener('abort', onExternalCancel);
          }
          this.startedServices.length = 0;
          this.isStopped = true;
          this.unregisterSignals();
          this.lifetime.notifyStopped();
        }

        resolvePromise();
      } catch (err) {
        rejectPromise(err);
      }
    })();

    return this.activeStopPromise;
  }
}
