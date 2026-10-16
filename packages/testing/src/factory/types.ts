import { ServiceCollection, LoggerFactory, LogLevel, IConfiguration } from '@tsnx/hosting';
import { WebApplication, WebApplicationBuilder, HttpServerOptions } from '@tsnx/web';
import { WebApplicationFactoryClientOptions } from '../client/test-http-client.js';

export type AppFactoryResult = WebApplication | WebApplicationBuilder;

export type AppFactory = () => AppFactoryResult | Promise<AppFactoryResult>;

export type ConfigureServicesCallback = (services: ServiceCollection) => void;
export type ConfigureConfigurationCallback = (config: IConfiguration) => void;
export type ConfigureLoggingCallback = (logging: LoggerFactory) => void;

/**
 * Interface representing the host builder configuration in ASP.NET Core style.
 */
export interface IWebHostBuilder {
  configureServices(callback: ConfigureServicesCallback): this;
  configureAppConfiguration(callback: ConfigureConfigurationCallback): this;
  withSetting(key: string, value: any): this;
  withSettings(settings: Record<string, any>): this;
  configureLogging(callback: ConfigureLoggingCallback): this;
  configureServer(options: HttpServerOptions): this;
}

export interface WebApplicationFactoryOptions {
  /**
   * Host address to bind ephemeral server. Defaults to '127.0.0.1'.
   */
  host?: string;

  /**
   * Port to bind ephemeral server. Defaults to 0 (dynamic OS assignment).
   */
  port?: number;

  /**
   * Whether to register process signal handlers (SIGINT/SIGTERM). Defaults to false in test host.
   */
  registerSignalHandlers?: boolean;

  /**
   * Suppress informational server logging (HTTP Server listening/stopping logs) for clean test runs.
   * Defaults to false.
   */
  silent?: boolean;

  /**
   * Explicit minimum log level for the test host.
   */
  logLevel?: LogLevel;

  /**
   * Additional HTTP server options.
   */
  serverOptions?: HttpServerOptions;

  /**
   * Default client options applied when calling createClient().
   */
  clientOptions?: WebApplicationFactoryClientOptions;
}
