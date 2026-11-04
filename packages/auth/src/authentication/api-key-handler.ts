// SPDX-License-Identifier: MIT

import { HttpContext } from '@tsnx/web';
import { IAuthenticationHandler } from './types.js';
import { AuthenticateResult } from './result.js';
import { Claim, ClaimTypes } from '../claims/claim.js';
import { ClaimsPrincipal } from '../claims/claims-principal.js';

export interface ApiKeyOptions {
  /** The scheme name (defaults to 'ApiKey'). */
  scheme?: string;
  /** The header name containing the API key (defaults to 'x-api-key'). */
  headerName?: string;
  /** Function or list of valid API keys. */
  validator:
    | string
    | readonly string[]
    | ((apiKey: string, ctx: HttpContext) => boolean | Promise<boolean | readonly Claim[]>);
}

export class ApiKeyAuthenticationHandler implements IAuthenticationHandler {
  public readonly scheme: string;
  private readonly headerName: string;
  private readonly validator: ApiKeyOptions['validator'];

  constructor(options: ApiKeyOptions) {
    this.scheme = options.scheme ?? 'ApiKey';
    this.headerName = (options.headerName ?? 'x-api-key').toLowerCase();
    this.validator = options.validator;
  }

  public async authenticate(ctx: HttpContext): Promise<AuthenticateResult> {
    const rawHeader = ctx.request.headers[this.headerName];
    if (!rawHeader) {
      return AuthenticateResult.noResult();
    }

    const apiKey = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    if (!apiKey) {
      return AuthenticateResult.noResult();
    }

    try {
      if (typeof this.validator === 'string') {
        if (apiKey !== this.validator) {
          return AuthenticateResult.fail('Invalid API key.');
        }
        return AuthenticateResult.success(
          ClaimsPrincipal.fromClaims(
            [{ type: ClaimTypes.NameIdentifier, value: 'api-client' }],
            this.scheme,
          ),
        );
      }

      if (Array.isArray(this.validator)) {
        if (!this.validator.includes(apiKey)) {
          return AuthenticateResult.fail('Invalid API key.');
        }
        return AuthenticateResult.success(
          ClaimsPrincipal.fromClaims(
            [{ type: ClaimTypes.NameIdentifier, value: 'api-client' }],
            this.scheme,
          ),
        );
      }

      if (typeof this.validator === 'function') {
        const result = await this.validator(apiKey, ctx);
        if (result === false) {
          return AuthenticateResult.fail('Invalid API key.');
        }

        const claims: readonly Claim[] = Array.isArray(result)
          ? result
          : [{ type: ClaimTypes.NameIdentifier, value: 'api-client' }];

        return AuthenticateResult.success(ClaimsPrincipal.fromClaims(claims, this.scheme));
      }

      return AuthenticateResult.fail('Invalid API key validator configuration.');
    } catch (err: any) {
      return AuthenticateResult.fail(err?.message ?? 'API key validation failed.');
    }
  }
}
