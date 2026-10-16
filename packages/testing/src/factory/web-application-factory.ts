import {
  IServiceProviderRoot,
  IServiceProviderScope,
  IConfiguration,
} from '@tsnx/hosting';
import { WebApplication, WebApplicationBuilder, HttpServerOptions } from '@tsnx/web';
import { TestHttpClient } from '../client/test-http-client.js';
import { AppFactory, ConfigureServicesCallback, WebApplicationFactoryOptions } from './types.js';

/**
 * Test host for integration testing TSNX Web Applications with ephemeral ports,
 * deterministic disposal, and dependency injection service overrides.
 */
export class WebApplicationFactory {
  private readonly serviceOverrides: ConfigureServicesCallback[] = [];
  private instance?: WebApplication;
  private client?: TestHttpClient;
  private isDisposed = false;
  private startPromise?: Promise<void>;

  constructor(
    private readonly appFactory: AppFactory,
    private readonly options: WebApplicationFactoryOptions = {},
  ) {}

  /**
   * Configure and override services in the dependency injection container before the application starts.
   */
  public configureServices(callback: ConfigureServicesCallback): this {
    if (this.instance) {
      throw new Error('Cannot configure services after the test host has already started.');
    }
    this.serviceOverrides.push(callback);
    return this;
  }

  /**
   * Configure server options for the test host.
   */
  public configureServer(options: HttpServerOptions): this {
    if (this.instance) {
      throw new Error('Cannot configure server after the test host has already started.');
    }
    this.options.serverOptions = {
      ...(this.options.serverOptions ?? {}),
      ...options,
    };
    return this;
  }

  /**
   * The underlying WebApplication instance.
   */
  public get app(): WebApplication {
    if (!this.instance) {
      throw new Error('Application has not been initialized. Call start() or createClient() first.');
    }
    return this.instance;
  }

  /**
   * Root service provider of the running application host.
   */
  public get services(): IServiceProviderRoot {
    return this.app.services;
  }

  /**
   * Application configuration.
   */
  public get configuration(): IConfiguration {
    return this.app.configuration;
  }

  /**
   * Base address for HTTP requests (e.g. "http://127.0.0.1:45321").
   */
  public get baseAddress(): string {
    const port = this.app.listeningPort;
    if (port === undefined || port <= 0) {
      throw new Error('Test server has not bound a listening port yet. Ensure start() has completed.');
    }
    const host = this.options.host ?? '127.0.0.1';
    return `http://${host}:${port}`;
  }

  /**
   * Start the test server and return an HTTP client bound to the ephemeral address.
   */
  public async createClient(): Promise<TestHttpClient> {
    await this.start();
    if (!this.client) {
      this.client = new TestHttpClient(this.baseAddress);
    }
    return this.client;
  }

  /**
   * Create an isolated dependency injection scope from the running application host.
   */
  public createScope(): IServiceProviderScope {
    return this.services.createScope();
  }

  /**
   * Boot the test application on an ephemeral port.
   */
  public async start(): Promise<void> {
    if (this.isDisposed) {
      throw new Error('Cannot start a disposed WebApplicationFactory.');
    }

    if (this.startPromise) {
      return this.startPromise;
    }

    this.startPromise = (async () => {
      const result = await this.appFactory();

      const host = this.options.host ?? '127.0.0.1';
      const port = this.options.port ?? 0;
      const registerSignalHandlers = this.options.registerSignalHandlers ?? false;
      const extraServerOptions = this.options.serverOptions ?? {};

      if (result instanceof WebApplicationBuilder) {
        // Apply service overrides
        for (const override of this.serviceOverrides) {
          result.configureServices(override);
        }
        // Configure test server options
        result.configureServer({
          host,
          port,
          ...extraServerOptions,
        });
        result.hostOptions.registerSignalHandlers = registerSignalHandlers;
        this.instance = result.build();
      } else if (result instanceof WebApplication) {
        this.instance = result;
        // Configure test server options
        this.instance.configureServer({
          host,
          port,
          ...extraServerOptions,
        });
        this.instance.hostOptions.registerSignalHandlers = registerSignalHandlers;
        // Apply service overrides
        for (const override of this.serviceOverrides) {
          this.instance.configureServices(override);
        }
      } else {
        throw new Error(
          'AppFactory must return an instance of WebApplication or WebApplicationBuilder.',
        );
      }

      await this.instance.start();
    })();

    return this.startPromise;
  }

  /**
   * Stop the test host.
   */
  public async stop(cancellationToken?: AbortSignal): Promise<void> {
    if (this.instance) {
      await this.instance.stop(cancellationToken);
    }
  }

  /**
   * Deterministically dispose the test host, release sockets, and clean up DI resources.
   */
  public async dispose(): Promise<void> {
    if (this.isDisposed) return;
    this.isDisposed = true;

    if (this.startPromise) {
      try {
        await this.startPromise;
      } catch {
        // Ignore initialization errors during disposal
      }
    }

    if (this.instance) {
      await this.instance.dispose();
      this.instance = undefined;
    }
    this.client = undefined;
  }

  /**
   * Support for TypeScript 5.2+ "await using" syntax.
   */
  public async [Symbol.asyncDispose](): Promise<void> {
    await this.dispose();
  }
}
