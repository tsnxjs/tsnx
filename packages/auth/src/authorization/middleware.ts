// SPDX-License-Identifier: MIT

import { HttpContext, Middleware, RequestDelegate } from '@tsnx/web';
import { AuthorizationService } from './service.js';
import { AUTHORIZE_METADATA_KEY, ALLOW_ANONYMOUS_METADATA_KEY, AuthorizeMetadata } from '../endpoints/metadata.js';
import { ClaimsPrincipal } from '../claims/claims-principal.js';

export const AUTHORIZATION_SERVICE = Symbol.for('tsnx.auth.authorization_service');

/**
 * Middleware that evaluates authorization policies for the target endpoint.
 */
export function createAuthorizationMiddleware(): Middleware {
  return async (ctx: HttpContext, next: RequestDelegate): Promise<void> => {
    let authzService: AuthorizationService | undefined;

    try {
      authzService = ctx.services.get(AUTHORIZATION_SERVICE);
    } catch {
      // Authorization service not registered
    }

    if (!authzService) {
      await next(ctx);
      return;
    }

    const metadata = ctx.items.get('__tsnx_endpoint_metadata');
    const isAllowAnonymous =
      metadata && typeof metadata.getCustom === 'function' && Boolean(metadata.getCustom(ALLOW_ANONYMOUS_METADATA_KEY));

    if (isAllowAnonymous) {
      await next(ctx);
      return;
    }

    const authorizeData =
      metadata && typeof metadata.getCustom === 'function'
        ? (metadata.getCustom(AUTHORIZE_METADATA_KEY) as AuthorizeMetadata | undefined)
        : undefined;

    const requiresAuth = Boolean(authorizeData) || Boolean(authzService.fallbackPolicy);

    if (!requiresAuth) {
      await next(ctx);
      return;
    }

    const user: ClaimsPrincipal = ctx.user ?? ClaimsPrincipal.createAnonymous();

    // 1. Challenge unauthenticated users with 401
    if (!user.isAuthenticated) {
      ctx.response.setHeader('WWW-Authenticate', 'Bearer error="invalid_token"');
      await ctx.response.writeProblem({
        status: 401,
        title: 'Unauthorized',
        detail: 'Authentication is required to access this resource.',
      });
      return;
    }

    // 2. Evaluate Policy
    const targetPolicy = authorizeData?.policyName ?? authzService.fallbackPolicy;
    const result = await authzService.authorize(user, ctx, targetPolicy);

    if (!result.succeeded) {
      await ctx.response.writeProblem({
        status: 403,
        title: 'Forbidden',
        detail: result.failureReason ?? 'You do not have permission to access this resource.',
      });
      return;
    }

    await next(ctx);
  };
}
