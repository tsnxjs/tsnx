// SPDX-License-Identifier: MIT

import { IServiceCollection } from '@tsnx/hosting-abstractions';
import { WebApplication, WebApplicationBuilder, ServiceCollection } from '@tsnx/web';
import { AuthenticationService } from './authentication/service.js';
import { AUTHENTICATION_SERVICE, createAuthenticationMiddleware } from './authentication/middleware.js';
import { IAuthenticationHandler, AuthenticationOptions } from './authentication/types.js';
import { JwtBearerAuthenticationHandler, JwtBearerOptions } from './authentication/jwt-bearer-handler.js';
import { ApiKeyAuthenticationHandler, ApiKeyOptions } from './authentication/api-key-handler.js';
import { AuthorizationService } from './authorization/service.js';
import { AUTHORIZATION_SERVICE, createAuthorizationMiddleware } from './authorization/middleware.js';

export class AuthenticationBuilder {
  constructor(
    public readonly services: IServiceCollection,
    public readonly authService: AuthenticationService,
  ) {}

  /**
   * Registers a JWT Bearer authentication handler with symmetric or asymmetric validation.
   */
  public addJwtBearer(options: JwtBearerOptions = {}): this {
    const handler = new JwtBearerAuthenticationHandler(options);
    this.authService.registerHandler(handler);
    return this;
  }

  /**
   * Registers an API Key authentication handler.
   */
  public addApiKey(options: ApiKeyOptions): this {
    const handler = new ApiKeyAuthenticationHandler(options);
    this.authService.registerHandler(handler);
    return this;
  }

  /**
   * Registers a custom IAuthenticationHandler implementation.
   */
  public addHandler(handler: IAuthenticationHandler): this {
    this.authService.registerHandler(handler);
    return this;
  }
}

/**
 * Adds and configures the TSNX Authentication Subsystem in the dependency injection container.
 * Modeled after ASP.NET Core services.AddAuthentication().
 */
export function addAuthentication(
  services: IServiceCollection,
  options: AuthenticationOptions = {},
): AuthenticationBuilder {
  const authService = new AuthenticationService(options);

  services.add({
    token: AUTHENTICATION_SERVICE,
    lifetime: 'singleton',
    instance: authService,
  });

  return new AuthenticationBuilder(services, authService);
}

/**
 * Adds and configures the TSNX Policy-Based Authorization Subsystem in DI.
 * Modeled after ASP.NET Core services.AddAuthorization().
 */
export function addAuthorization(
  services: IServiceCollection,
  configure?: (authz: AuthorizationService) => void,
): IServiceCollection {
  const authzService = new AuthorizationService();

  if (configure) {
    configure(authzService);
  }

  services.add({
    token: AUTHORIZATION_SERVICE,
    lifetime: 'singleton',
    instance: authzService,
  });

  return services;
}

declare module '@tsnx/hosting-abstractions' {
  interface IServiceCollection {
    /**
     * Adds and configures the TSNX Authentication Subsystem in DI.
     * Modeled after ASP.NET Core builder.services.addAuthentication().
     */
    addAuthentication(options?: AuthenticationOptions): AuthenticationBuilder;

    /**
     * Adds and configures the TSNX Policy-Based Authorization Subsystem in DI.
     * Modeled after ASP.NET Core builder.services.addAuthorization().
     */
    addAuthorization(configure?: (authz: AuthorizationService) => void): this;
  }
}

declare module '@tsnx/hosting' {
  interface ServiceCollection {
    /**
     * Adds and configures the TSNX Authentication Subsystem in DI.
     * Modeled after ASP.NET Core builder.services.addAuthentication().
     */
    addAuthentication(options?: AuthenticationOptions): AuthenticationBuilder;

    /**
     * Adds and configures the TSNX Policy-Based Authorization Subsystem in DI.
     * Modeled after ASP.NET Core builder.services.addAuthorization().
     */
    addAuthorization(configure?: (authz: AuthorizationService) => void): this;
  }
}

declare module '@tsnx/web' {
  interface WebApplicationBuilder {
    /**
     * Adds and configures the TSNX Authentication Subsystem in DI.
     */
    addAuthentication(options?: AuthenticationOptions): AuthenticationBuilder;

    /**
     * Adds and configures the TSNX Policy-Based Authorization Subsystem in DI.
     */
    addAuthorization(configure?: (authz: AuthorizationService) => void): this;
  }

  interface WebApplication {
    /**
     * Enables authentication middleware in the pipeline, evaluating incoming credentials and setting ctx.user.
     */
    useAuthentication(): this;

    /**
     * Enables authorization middleware in the pipeline, evaluating endpoint policies before route execution.
     */
    useAuthorization(): this;

    /**
     * Convenience method enabling both authentication and authorization middleware in correct sequence.
     */
    useAuth(): this;

    /**
     * Diagnostic guard: hints user if addAuthorization was accidentally called on app instead of builder.services.
     */
    addAuthorization?(...args: any[]): never;

    /**
     * Diagnostic guard: hints user if addAuthentication was accidentally called on app instead of builder.services.
     */
    addAuthentication?(...args: any[]): never;
  }
}

// Attach prototype methods to WebApplicationBuilder
if (!(WebApplicationBuilder.prototype as any).addAuthentication) {
  (WebApplicationBuilder.prototype as any).addAuthentication = function (
    this: WebApplicationBuilder,
    options?: AuthenticationOptions,
  ): AuthenticationBuilder {
    return addAuthentication(this.services, options);
  };
}

if (!(WebApplicationBuilder.prototype as any).addAuthorization) {
  (WebApplicationBuilder.prototype as any).addAuthorization = function (
    this: WebApplicationBuilder,
    configure?: (authz: AuthorizationService) => void,
  ): WebApplicationBuilder {
    addAuthorization(this.services, configure);
    return this;
  };
}

// Attach prototype methods to ServiceCollection
if (!(ServiceCollection.prototype as any).addAuthentication) {
  (ServiceCollection.prototype as any).addAuthentication = function (
    this: ServiceCollection,
    options?: AuthenticationOptions,
  ): AuthenticationBuilder {
    return addAuthentication(this, options);
  };
}

if (!(ServiceCollection.prototype as any).addAuthorization) {
  (ServiceCollection.prototype as any).addAuthorization = function (
    this: ServiceCollection,
    configure?: (authz: AuthorizationService) => void,
  ): ServiceCollection {
    addAuthorization(this, configure);
    return this;
  };
}

// Attach prototype methods to WebApplication
if (!(WebApplication.prototype as any).useAuthentication) {
  (WebApplication.prototype as any).useAuthentication = function (this: WebApplication): WebApplication {
    this.use(createAuthenticationMiddleware());
    return this;
  };
}

if (!(WebApplication.prototype as any).useAuthorization) {
  (WebApplication.prototype as any).useAuthorization = function (this: WebApplication): WebApplication {
    this.use(createAuthorizationMiddleware());
    return this;
  };
}

if (!(WebApplication.prototype as any).useAuth) {
  (WebApplication.prototype as any).useAuth = function (this: WebApplication): WebApplication {
    this.useAuthentication();
    this.useAuthorization();
    return this;
  };
}

// Diagnostic stubs if called on app
if (!(WebApplication.prototype as any).addAuthorization) {
  (WebApplication.prototype as any).addAuthorization = function () {
    throw new Error(
      'Cannot call app.addAuthorization() after builder.build(). Services must be configured before building the application. Use builder.addAuthorization() or builder.services.addAuthorization() before builder.build(), and app.useAuth() / app.useAuthorization() on app.',
    );
  };
}

if (!(WebApplication.prototype as any).addAuthentication) {
  (WebApplication.prototype as any).addAuthentication = function () {
    throw new Error(
      'Cannot call app.addAuthentication() after builder.build(). Services must be configured before building the application. Use builder.addAuthentication() or builder.services.addAuthentication() before builder.build(), and app.useAuth() / app.useAuthentication() on app.',
    );
  };
}


