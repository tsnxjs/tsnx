import { ServiceCollection } from '@tsnx/hosting';
import { WebApplication, WebApplicationBuilder, HttpServerOptions } from '@tsnx/web';

export type AppFactoryResult = WebApplication | WebApplicationBuilder;

export type AppFactory = () => AppFactoryResult | Promise<AppFactoryResult>;

export type ConfigureServicesCallback = (services: ServiceCollection) => void;

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
   * Additional HTTP server options.
   */
  serverOptions?: HttpServerOptions;
}
