// SPDX-License-Identifier: MIT

import { IServiceCollection } from '@tsnx/hosting-abstractions';
import { WebApplication } from '@tsnx/web';
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

declare module '@tsnx/web' {
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
  }
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
