// SPDX-License-Identifier: MIT

import { HttpContext } from '@tsnx/web';
import { IAuthenticationHandler, AuthenticationOptions } from './types.js';
import { AuthenticateResult } from './result.js';
import { ClaimsPrincipal } from '../claims/claims-principal.js';

export const AUTH_ITEMS_KEY = '__tsnx_auth_result__';

export class AuthenticationService {
  private readonly handlers: Map<string, IAuthenticationHandler> = new Map();
  public defaultScheme?: string;

  constructor(options: AuthenticationOptions = {}) {
    this.defaultScheme = options.defaultScheme;
  }

  public registerHandler(handler: IAuthenticationHandler): void {
    this.handlers.set(handler.scheme.toLowerCase(), handler);
    if (!this.defaultScheme) {
      this.defaultScheme = handler.scheme;
    }
  }

  public async authenticate(ctx: HttpContext, schemeName?: string): Promise<AuthenticateResult> {
    const targetScheme = schemeName ?? this.defaultScheme;
    if (!targetScheme) {
      const anon = ClaimsPrincipal.createAnonymous();
      ctx.user = anon;
      return AuthenticateResult.noResult();
    }

    const handler = this.handlers.get(targetScheme.toLowerCase());
    if (!handler) {
      throw new Error(`[TSNX Auth] No authentication handler registered for scheme "${targetScheme}".`);
    }

    const result = await handler.authenticate(ctx);
    ctx.items.set(AUTH_ITEMS_KEY, result);

    if (result.succeeded && result.principal) {
      ctx.user = result.principal;
    } else {
      ctx.user = ClaimsPrincipal.createAnonymous();
    }

    return result;
  }
}
