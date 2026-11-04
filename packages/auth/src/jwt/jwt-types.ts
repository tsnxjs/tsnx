// SPDX-License-Identifier: MIT

export interface JwtHeader {
  alg: string;
  typ?: string;
  kid?: string;
  [key: string]: unknown;
}

export interface JwtPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  role?: string | string[];
  roles?: string | string[];
  scope?: string | string[];
  permissions?: string | string[];
  [key: string]: unknown;
}

export interface TokenValidationParameters {
  /** Expected issuer or list of valid issuers. */
  issuer?: string | readonly string[];
  /** Expected audience or list of valid audiences. */
  audience?: string | readonly string[];
  /** Whether to validate the issuer claim (defaults to true if issuer is configured). */
  validateIssuer?: boolean;
  /** Whether to validate the audience claim (defaults to true if audience is configured). */
  validateAudience?: boolean;
  /** Whether to validate token lifetime (exp/nbf) (defaults to true). */
  validateLifetime?: boolean;
  /** Clock tolerance in seconds to account for clock drift (defaults to 60). */
  clockToleranceSeconds?: number;
  /** Symmetric secret key for HS256/HS384/HS512 signatures. */
  secretKey?: string | Uint8Array | CryptoKey;
  /** Public key (PEM format or CryptoKey) for RS256/ES256 signatures. */
  publicKey?: string | Uint8Array | CryptoKey;
  /** Remote JWKS URI to fetch signing keys dynamically (e.g. from Keycloak, Auth0, Okta). */
  jwksUri?: string;
  /** Cache duration in milliseconds for downloaded JWKS keys (defaults to 10 minutes). */
  jwksCacheTtlMs?: number;
}
