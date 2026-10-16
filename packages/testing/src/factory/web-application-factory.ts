import {
  IServiceProviderRoot,
  IServiceProviderScope,
  IConfiguration,
  LoggerFactory,
  LogLevel,
  MemoryConfigurationProvider,
} from '@tsnx/hosting';
import { WebApplication, WebApplicationBuilder, HttpServerOptions } from '@tsnx/web';
import { TestHttpClient, WebApplicationFactoryClientOptions } from '../client/test-http-client.js';
import {
  AppFactory,
  ConfigureServicesCallback,
  ConfigureConfigurationCallback,
  ConfigureLoggingCallback,
  IWebHostBuilder,
  WebApplicationFactoryOptions,
} from './types.js';

/**
 * Test host for integration testing TSNX Web Applications with ephemeral ports,
 * deterministic disposal, and dependency injection service overrides.
 * Modeled closely after ASP.NET Core's WebApplicationFactory.
 */
export class WebApplicationFactory implements IWebHostBuilder {
  private readonly serviceOverrides: ConfigureServicesCallback[] = [];
  private readonly configOverrides: ConfigureConfigurationCallback[] = [];
  private readonly loggingOverrides: ConfigureLoggingCallback[] = [];
  private instance?: WebApplication;
  private isDisposed = false;
  private startPromise?: Promise<void>;

  constructor(
    private readonly appFactory: AppFactory,
    private readonly options: WebApplicationFactoryOptions = {},
  ) {}

  /**
   * Configure the host builder using a lambda (ASP.NET Core WithWebHostBuilder style).
   */
  public withWebHostBuilder(configure: (builder: IWebHostBuilder) => void): this {
    if (this.instance) {
      throw new Error('Cannot configure web host builder after the test host has already started.');
    }
    configure(this);
    return this;
  }

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
   * Configure application configuration providers before the application starts (ASP.NET Core ConfigureAppConfiguration).
   */
  public configureAppConfiguration(callback: ConfigureConfigurationCallback): this {
    if (this.instance) {
      throw new Error('Cannot configure application configuration after the test host has already started.');
    }
    this.configOverrides.push(callback);
    return this;
  }

  /**
   * Set an In-Memory configuration key/value pair (ASP.NET Core AddInMemoryCollection shortcut).
   */
  public withSetting(key: string, value: any): this {
    return this.configureAppConfiguration((config) => {
      config.addProvider(new MemoryConfigurationProvider({ [key]: value }));
    });
  }

  /**
   * Set multiple In-Memory configuration key/value pairs.
   */
  public withSettings(settings: Record<string, any>): this {
    return this.configureAppConfiguration((config) => {
      config.addProvider(new MemoryConfigurationProvider(settings));
    });
  }

  /**
   * Configure the logging factory before the application starts (ASP.NET Core ConfigureLogging).
   */
  public configureLogging(callback: ConfigureLoggingCallback): this {
    if (this.instance) {
      throw new Error('Cannot configure logging after the test host has already started.');
    }
    this.loggingOverrides.push(callback);
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
   * Application logging factory.
   */
  public get logging(): LoggerFactory {
    return this.app.logging;
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
   * Modeled after ASP.NET Core's CreateClient(WebApplicationFactoryClientOptions).
   */
  public async createClient(options?: WebApplicationFactoryClientOptions): Promise<TestHttpClient> {
    await this.start();
    const mergedOptions: WebApplicationFactoryClientOptions = {
      ...(this.options.clientOptions ?? {}),
      ...(options ?? {}),
      defaultRequestHeaders: {
        ...(this.options.clientOptions?.defaultRequestHeaders as any),
        ...(options?.defaultRequestHeaders as any),
      },
    };
    return new TestHttpClient(this.baseAddress, mergedOptions);
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
        // Logging configuration & silencing
        if (this.options.silent) {
          result.logging.setMinimumLevel(LogLevel.Warning);
        }
        if (this.options.logLevel !== undefined) {
          result.logging.setMinimumLevel(this.options.logLevel);
        }
        for (const loggingCallback of this.loggingOverrides) {
          result.configureLogging(loggingCallback);
        }

        // Configuration overrides
        for (const configCallback of this.configOverrides) {
          result.configureAppConfiguration(configCallback);
        }

        // Service overrides
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

        // Logging configuration & silencing
        if (this.options.silent) {
          this.instance.logging.setMinimumLevel(LogLevel.Warning);
        }
        if (this.options.logLevel !== undefined) {
          this.instance.logging.setMinimumLevel(this.options.logLevel);
        }
        for (const loggingCallback of this.loggingOverrides) {
          this.instance.configureLogging(loggingCallback);
        }

        // Configuration overrides
        for (const configCallback of this.configOverrides) {
          this.instance.configureAppConfiguration(configCallback);
        }

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
  }

  /**
   * Support for TypeScript 5.2+ "await using" syntax.
   */
  public async [Symbol.asyncDispose](): Promise<void> {
    await this.dispose();
  }
}
