// SPDX-License-Identifier: MIT

import { HttpContext } from '@tsnx/web';
import { IAuthenticationHandler } from './types.js';
import { AuthenticateResult } from './result.js';
import { ClaimsPrincipal } from '../claims/claims-principal.js';
import { TokenValidationParameters } from '../jwt/jwt-types.js';
import { JwtVerifier } from '../jwt/jwt-verifier.js';

export interface JwtBearerOptions {
  /** The scheme name (defaults to 'Bearer'). */
  scheme?: string;
  /** Expected issuer (e.g. 'https://my-company.auth0.com/'). */
  issuer?: string | readonly string[];
  /** Expected audience (e.g. 'https://api.my-company.com'). */
  audience?: string | readonly string[];
  /** Remote JWKS URI (e.g. 'https://my-company.auth0.com/.well-known/jwks.json'). */
  jwksUri?: string;
  /** Symmetric secret key for HS256/384/512 tokens. */
  secretKey?: string | Uint8Array | CryptoKey;
  /** Alias for secretKey. */
  secret?: string | Uint8Array | CryptoKey;
  /** Public key in PEM format or CryptoKey for RS256/ES256 tokens. */
  publicKey?: string | Uint8Array | CryptoKey;
  /** Full custom validation parameters if advanced options are required. */
  tokenValidationParameters?: TokenValidationParameters;
}

export class JwtBearerAuthenticationHandler implements IAuthenticationHandler {
  public readonly scheme: string;
  private readonly verifier: JwtVerifier;

  constructor(options: JwtBearerOptions) {
    this.scheme = options.scheme ?? 'Bearer';

    const validationParams: TokenValidationParameters = options.tokenValidationParameters ?? {
      issuer: options.issuer,
      audience: options.audience,
      jwksUri: options.jwksUri,
      secretKey: options.secretKey ?? options.secret,
      publicKey: options.publicKey,
    };

    this.verifier = new JwtVerifier(validationParams);
  }

  public async authenticate(ctx: HttpContext): Promise<AuthenticateResult> {
    const authHeader = ctx.request.headers['authorization'];
    if (!authHeader) {
      return AuthenticateResult.noResult();
    }

    const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    const match = /^Bearer\s+(.+)$/i.exec(headerValue.trim());
    if (!match) {
      return AuthenticateResult.noResult();
    }

    const token = match[1];

    try {
      const verified = await this.verifier.verify(token);
      const principal = ClaimsPrincipal.fromClaims(verified.claims, this.scheme);
      return AuthenticateResult.success(principal);
    } catch (err: any) {
      return AuthenticateResult.fail(err?.message ?? 'Invalid JWT Bearer token.');
    }
  }
}
