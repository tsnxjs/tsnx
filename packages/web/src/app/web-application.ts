import {
  HostApplicationBuilder,
  ServiceCollection,
  IConfiguration,
  LoggerFactory,
  IHost,
  IServiceProviderRoot,
  ServiceProviderOptions,
  HostOptions,
  Constructor,
  IServiceProvider,
} from '@tsnx/hosting';
import { HttpContext } from '../http/http-context.js';
import { RouteHandler, Results } from '../http/results.js';
import { Middleware, MiddlewarePipeline, RequestDelegate } from '../middleware/pipeline.js';
import { createExceptionHandlerMiddleware } from '../middleware/exception-handler.js';
import { Router } from '../routing/router.js';
import { HttpServerHostedService, HttpServerOptions } from '../server/http-server.js';
import {
  IExceptionHandler,
  EXCEPTION_HANDLER_TOKEN,
  ExceptionHandlerPipeline,
} from '../errors/index.js';
import { RouteHandlerBuilder } from '../filters/route-handler-builder.js';
import { EndpointFilterPipeline } from '../filters/filter-pipeline.js';
import { DefaultEndpointFilterInvocationContext } from '../filters/invocation-context.js';
import { EndpointArgumentDescriptor, InferDescriptors } from '../descriptors/types.js';
import { RouteGroupBuilder } from '../groups/route-group-builder.js';
import { EndpointMetadataCollection } from '../metadata/collection.js';

export interface EndpointInfo {
  readonly method: string;
  readonly pattern: string;
  readonly descriptors: readonly EndpointArgumentDescriptor[];
  readonly builder?: RouteHandlerBuilder;
  readonly metadata: EndpointMetadataCollection;
}

export class WebApplicationBuilder {
  private readonly builder: HostApplicationBuilder;
  private readonly serverOptions: HttpServerOptions = {};

  constructor(args: string[] = []) {
    this.builder = new HostApplicationBuilder(args);
  }

  public get services(): ServiceCollection {
    return this.builder.services;
  }

  public get configuration(): IConfiguration {
    return this.builder.config;
  }

  public get logging(): LoggerFactory {
    return this.builder.logging;
  }

  public get hostOptions(): HostOptions {
    return this.builder.options;
  }

  public get serviceProviderOptions(): ServiceProviderOptions {
    return this.builder.serviceProviderOptions;
  }

  public configureServiceProvider(options: Partial<ServiceProviderOptions>): this {
    this.builder.configureServiceProvider(options);
    return this;
  }

  public configureServices(configure: (services: ServiceCollection) => void): this {
    configure(this.services);
    return this;
  }

  public configureLogging(configure: (logging: LoggerFactory) => void): this {
    configure(this.logging);
    return this;
  }

  public configureAppConfiguration(configure: (config: IConfiguration) => void): this {
    configure(this.configuration);
    return this;
  }

  public configureServer(options: HttpServerOptions): this {
    Object.assign(this.serverOptions, options);
    return this;
  }

  public addExceptionHandler<T extends IExceptionHandler>(
    handler: Constructor<T> | ((sp: IServiceProvider) => T),
    ...dependencies: any[]
  ): this {
    this.services.addExceptionHandler(handler, ...dependencies);
    return this;
  }

  public build(options?: ServiceProviderOptions): WebApplication {
    if (options) {
      this.builder.configureServiceProvider(options);
    }
    const router = new Router();
    const pipeline = new MiddlewarePipeline();

    // Default exception handler pipeline
    const handlerDescriptors = this.builder.services.findAll(EXCEPTION_HANDLER_TOKEN);
    const logger = this.builder.logging.createLogger('ExceptionHandler');
    const isDev =
      this.builder.config.get('Environment') === 'Development' ||
      process.env.NODE_ENV === 'development';
    const exceptionPipeline = new ExceptionHandlerPipeline(handlerDescriptors, logger, {
      includeDetails: isDev,
    });
    pipeline.use(createExceptionHandlerMiddleware(exceptionPipeline));

    return new WebApplication(this.builder, router, pipeline, this.serverOptions);
  }

  public async buildAsync(options?: ServiceProviderOptions): Promise<WebApplication> {
    return this.build(options);
  }
}

export class WebApplication {
  private readonly hostBuilder: HostApplicationBuilder;
  private readonly router: Router;
  private readonly pipeline: MiddlewarePipeline;
  private readonly initialServerOptions: HttpServerOptions;
  private effectiveServerOptions?: HttpServerOptions;
  private appHost?: IHost;
  private serverHostedService?: HttpServerHostedService;
  private initPromise?: Promise<void>;

  constructor(
    hostBuilder: HostApplicationBuilder,
    router: Router,
    pipeline: MiddlewarePipeline,
    serverOptions: HttpServerOptions
  ) {
    this.hostBuilder = hostBuilder;
    this.router = router;
    this.pipeline = pipeline;
    this.initialServerOptions = serverOptions;
  }

  public get services(): IServiceProviderRoot {
    if (!this.appHost) {
      throw new Error('Application has not been started yet. Call start() or run() first.');
    }
    return this.appHost.services;
  }

  public get configuration(): IConfiguration {
    return this.hostBuilder.config;
  }

  public get serverOptions(): Readonly<HttpServerOptions> {
    return this.effectiveServerOptions ?? this.initialServerOptions;
  }

  public get hostOptions(): HostOptions {
    return this.hostBuilder.options;
  }

  public get logging(): LoggerFactory {
    return this.hostBuilder.logging;
  }

  public configureServices(configure: (services: ServiceCollection) => void): this {
    if (this.appHost) {
      throw new Error('Cannot configure services after the application has started.');
    }
    configure(this.hostBuilder.services);
    return this;
  }

  public configureLogging(configure: (logging: LoggerFactory) => void): this {
    if (this.appHost) {
      throw new Error('Cannot configure logging after the application has started.');
    }
    configure(this.hostBuilder.logging);
    return this;
  }

  public configureAppConfiguration(configure: (config: IConfiguration) => void): this {
    if (this.appHost) {
      throw new Error('Cannot configure application configuration after the application has started.');
    }
    configure(this.hostBuilder.config);
    return this;
  }

  public configureServer(options: HttpServerOptions): this {
    if (this.appHost) {
      throw new Error('Cannot configure server options after the application has started.');
    }
    Object.assign(this.initialServerOptions, options);
    return this;
  }

  public get listeningPort(): number | undefined {
    return this.serverHostedService?.listeningPort;
  }

  public use(middleware: Middleware): this {
    this.pipeline.use(middleware);
    return this;
  }

  public mapGet(pattern: string, handler: RouteHandler): RouteHandlerBuilder;
  public mapGet<const T extends readonly EndpointArgumentDescriptor[]>(
    pattern: string,
    descriptors: T,
    handler: (...args: InferDescriptors<T>) => any,
  ): RouteHandlerBuilder;
  public mapGet(
    pattern: string,
    handlerOrDescriptors: RouteHandler | readonly EndpointArgumentDescriptor[],
    maybeHandler?: (...args: any[]) => any,
  ): RouteHandlerBuilder {
    return this.mapEndpoint('GET', pattern, handlerOrDescriptors, maybeHandler);
  }

  public mapPost(pattern: string, handler: RouteHandler): RouteHandlerBuilder;
  public mapPost<const T extends readonly EndpointArgumentDescriptor[]>(
    pattern: string,
    descriptors: T,
    handler: (...args: InferDescriptors<T>) => any,
  ): RouteHandlerBuilder;
  public mapPost(
    pattern: string,
    handlerOrDescriptors: RouteHandler | readonly EndpointArgumentDescriptor[],
    maybeHandler?: (...args: any[]) => any,
  ): RouteHandlerBuilder {
    return this.mapEndpoint('POST', pattern, handlerOrDescriptors, maybeHandler);
  }

  public mapPut(pattern: string, handler: RouteHandler): RouteHandlerBuilder;
  public mapPut<const T extends readonly EndpointArgumentDescriptor[]>(
    pattern: string,
    descriptors: T,
    handler: (...args: InferDescriptors<T>) => any,
  ): RouteHandlerBuilder;
  public mapPut(
    pattern: string,
    handlerOrDescriptors: RouteHandler | readonly EndpointArgumentDescriptor[],
    maybeHandler?: (...args: any[]) => any,
  ): RouteHandlerBuilder {
    return this.mapEndpoint('PUT', pattern, handlerOrDescriptors, maybeHandler);
  }

  public mapDelete(pattern: string, handler: RouteHandler): RouteHandlerBuilder;
  public mapDelete<const T extends readonly EndpointArgumentDescriptor[]>(
    pattern: string,
    descriptors: T,
    handler: (...args: InferDescriptors<T>) => any,
  ): RouteHandlerBuilder;
  public mapDelete(
    pattern: string,
    handlerOrDescriptors: RouteHandler | readonly EndpointArgumentDescriptor[],
    maybeHandler?: (...args: any[]) => any,
  ): RouteHandlerBuilder {
    return this.mapEndpoint('DELETE', pattern, handlerOrDescriptors, maybeHandler);
  }

  public mapPatch(pattern: string, handler: RouteHandler): RouteHandlerBuilder;
  public mapPatch<const T extends readonly EndpointArgumentDescriptor[]>(
    pattern: string,
    descriptors: T,
    handler: (...args: InferDescriptors<T>) => any,
  ): RouteHandlerBuilder;
  public mapPatch(
    pattern: string,
    handlerOrDescriptors: RouteHandler | readonly EndpointArgumentDescriptor[],
    maybeHandler?: (...args: any[]) => any,
  ): RouteHandlerBuilder {
    return this.mapEndpoint('PATCH', pattern, handlerOrDescriptors, maybeHandler);
  }

  /**
   * Creates a route group with a common path prefix and shared filter/metadata inheritance.
   */
  public mapGroup(prefix: string): RouteGroupBuilder {
    return new RouteGroupBuilder(prefix, undefined, this);
  }

  /**
   * Introspects all registered endpoints and their compiled metadata for OpenAPI or reflection.
   */
  public get endpoints(): readonly EndpointInfo[] {
    return this.router.getRoutes().map(route => {
      const effectiveMetadata = route.compiledMetadata ?? route.builder?.buildEffectiveMetadata() ?? new EndpointMetadataCollection();
      return {
        method: route.method,
        pattern: route.pattern,
        descriptors: route.descriptors ?? [],
        builder: route.builder,
        metadata: effectiveMetadata,
      };
    });
  }

  public mapEndpoint(
    method: string,
    pattern: string,
    handlerOrDescriptors: RouteHandler | readonly EndpointArgumentDescriptor[],
    maybeHandler?: (...args: any[]) => any,
    parentGroup?: RouteGroupBuilder,
  ): RouteHandlerBuilder {
    const builder = new RouteHandlerBuilder(method, pattern, parentGroup);
    if (Array.isArray(handlerOrDescriptors)) {
      if (!maybeHandler) {
        throw new Error(`Handler function is required when descriptors are provided for route [${method}] ${pattern}`);
      }

      // Validate at registration time: a route cannot have multiple body() descriptors
      // because HTTP request stream can only be consumed once.
      const bodyCount = handlerOrDescriptors.filter(d => d.source === 'body').length;
      if (bodyCount > 1) {
        throw new Error(
          `Invalid route definition for [${method}] ${pattern}: found ${bodyCount} body() descriptors. An endpoint can bind the request body at most once.`
        );
      }

      this.router.map(method, pattern, maybeHandler, handlerOrDescriptors, builder);
    } else {
      this.router.map(method, pattern, handlerOrDescriptors as (...args: any[]) => any, undefined, builder);
    }
    return builder;
  }

  private setupHost(): void {
    if (this.serverHostedService) return;

    // Finalize endpoint registry deterministically before server starts listening:
    // - Validates endpoint name uniqueness (fails fast if duplicate names exist)
    // - Precompiles effective group & endpoint filters and metadata so first request has zero compilation overhead
    this.router.finalize();

    // Terminal endpoint routing delegate
    // Execution Flow:
    // 1. HTTP Middleware (Authentication, logging, request preprocessing, exception handling)
    // 2. Routing (Endpoint selection & URL parameter extraction)
    // 3. Declarative Binding (Strictly sequential resolution of body, service, route, query, header, context)
    // 4. Endpoint Filters (Inspect, transform in-place, or short-circuit arguments)
    // 5. Endpoint Handler (Execute terminal logic with final context.arguments)
    // 6. Response Execution (Execute HttpResult to response stream)
    const routingDelegate: RequestDelegate = async (ctx: HttpContext) => {
      const routingResult = this.router.match(ctx.request.method, ctx.request.path);

      if (routingResult.type === 'bad_request') {
        const result = Results.badRequest(routingResult.error);
        await result.executeAsync(ctx);
        return;
      }

      if (routingResult.type === 'not_found') {
        const result = Results.notFound(`No route found for [${ctx.request.method}] ${ctx.request.path}`);
        await result.executeAsync(ctx);
        return;
      }

      if (routingResult.type === 'options') {
        ctx.response.setHeader('Allow', routingResult.allowedMethods.join(', '));
        await ctx.response.end(204);
        return;
      }

      if (routingResult.type === 'method_not_allowed') {
        ctx.response.setHeader('Allow', routingResult.allowedMethods.join(', '));
        ctx.response.statusCode = 405;
        await ctx.response.writeJson({
          title: 'Method Not Allowed',
          status: 405,
          detail: `HTTP Method ${ctx.request.method} is not allowed on ${ctx.request.path}. Allowed: ${routingResult.allowedMethods.join(', ')}`,
        }, 405);
        return;
      }

      // Route matched
      ctx.params = routingResult.match.params;
      ctx.request.params = ctx.params;

      // Strictly sequential descriptor resolution to guarantee deterministic stream reading and error ordering
      const descriptors = routingResult.match.descriptors;
      let args: unknown[];
      if (descriptors !== undefined) {
        args = [];
        for (const desc of descriptors) {
          args.push(await desc.resolveAsync(ctx));
        }
      } else {
        args = [ctx];
      }

      const invocationContext = new DefaultEndpointFilterInvocationContext(ctx, args);
      // Uses precompiled effective filters (or fallback to on-the-fly compilation if matched outside initHost)
      const filters = routingResult.match.compiledFilters ?? routingResult.match.builder?.buildEffectiveFilters() ?? [];

      let result: unknown;
      if (filters.length > 0) {
        const filterPipeline = new EndpointFilterPipeline(filters);
        result = await filterPipeline.executeAsync(invocationContext, async (filterCtx) => {
          return await routingResult.match.handler(...filterCtx.arguments);
        });
      } else {
        result = await routingResult.match.handler(...invocationContext.arguments);
      }

      if (result && typeof (result as any).executeAsync === 'function') {
        if (!ctx.response.hasStarted && !ctx.response.raw.writableEnded) {
          await (result as any).executeAsync(ctx);
        }
      }
    };

    const finalPipeline = this.pipeline.build(routingDelegate);

    // Register HttpServerHostedService in DI and bind root provider
    const loggerFactory = this.hostBuilder.logging;
    const logger = loggerFactory.createLogger('HttpServer');

    // Default to Server configuration section if port or host omitted
    const effectiveServerOptions: HttpServerOptions = { ...this.initialServerOptions };
    const serverConfig = this.hostBuilder.config.getSection('Server');
    if (effectiveServerOptions.port === undefined) {
      const configPort = serverConfig.getNumber('Port');
      if (configPort !== undefined) {
        effectiveServerOptions.port = configPort;
      }
    }
    if (effectiveServerOptions.host === undefined) {
      const configHost = serverConfig.getString('Host');
      if (configHost !== undefined) {
        effectiveServerOptions.host = configHost;
      }
    }
    if (effectiveServerOptions.requestExecutionTimeoutMs === undefined) {
      const configTimeout = serverConfig.getNumber('RequestExecutionTimeoutMs') ?? serverConfig.getNumber('RequestTimeoutMs');
      if (configTimeout !== undefined) {
        effectiveServerOptions.requestExecutionTimeoutMs = configTimeout;
      }
    }
    if (effectiveServerOptions.shutdownDrainTimeoutMs === undefined) {
      const configDrain = serverConfig.getNumber('ShutdownDrainTimeoutMs');
      if (configDrain !== undefined) {
        effectiveServerOptions.shutdownDrainTimeoutMs = configDrain;
      }
    }

    this.effectiveServerOptions = effectiveServerOptions;

    const service = new HttpServerHostedService(finalPipeline, undefined, effectiveServerOptions, logger);
    this.serverHostedService = service;

    this.hostBuilder.services.addHostedService(() => service);
  }

  private initHost(): Promise<void> {
    if (this.appHost) return Promise.resolve();
    if (this.initPromise) {
      return this.initPromise;
    }

    const promise = (async () => {
      this.setupHost();
      this.appHost = await this.hostBuilder.buildAsync();
      this.serverHostedService!.setRootServices(this.appHost.services);
    })();

    this.initPromise = promise;

    promise.catch(() => {
      if (this.initPromise === promise) {
        this.initPromise = undefined;
      }
    });

    return promise;
  }

  public async start(): Promise<void> {
    await this.initHost();
    await this.appHost!.start();
  }

  public async stop(cancellationToken?: AbortSignal): Promise<void> {
    if (this.initPromise) {
      try {
        await this.initPromise;
      } catch {
        return;
      }
    }
    if (this.appHost) {
      await this.appHost.stop(cancellationToken);
    }
  }

  public async run(): Promise<void> {
    await this.initHost();
    await this.appHost!.run();
  }

  public async dispose(): Promise<void> {
    if (this.initPromise) {
      try {
        await this.initPromise;
      } catch {
        return;
      }
    }
    if (this.appHost) {
      await this.appHost.dispose();
    }
  }

  public async [Symbol.asyncDispose](): Promise<void> {
    await this.dispose();
  }

  public static createBuilder(args: string[] = []): WebApplicationBuilder {
    return new WebApplicationBuilder(args);
  }
}
