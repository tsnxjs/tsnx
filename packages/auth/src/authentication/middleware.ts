// SPDX-License-Identifier: MIT

import { HttpContext, Middleware, RequestDelegate } from '@tsnx/web';
import { AuthenticationService } from './service.js';

export const AUTHENTICATION_SERVICE = Symbol.for('tsnx.auth.authentication_service');

/**
 * Middleware that executes the registered authentication scheme(s) and attaches ClaimsPrincipal to ctx.user.
 */
export function createAuthenticationMiddleware(): Middleware {
  return async (ctx: HttpContext, next: RequestDelegate): Promise<void> => {
    let authService: AuthenticationService | undefined;

    try {
      authService = ctx.services.get(AUTHENTICATION_SERVICE);
    } catch {
      // Service not registered in DI
    }

    if (authService) {
      await authService.authenticate(ctx);
    }

    await next(ctx);
  };
}
