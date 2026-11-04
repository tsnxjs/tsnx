// SPDX-License-Identifier: MIT

/**
 * Standard claim type identifiers aligned with RFC 7519 (JWT) and WS-Federation/ASP.NET conventions.
 */
export const ClaimTypes = {
  /** RFC 7519: Subject identifier ('sub') */
  NameIdentifier: 'sub',
  /** RFC 7519: Full name ('name') */
  Name: 'name',
  /** RFC 7519: Given name ('given_name') */
  GivenName: 'given_name',
  /** RFC 7519: Family name ('family_name') */
  Surname: 'family_name',
  /** RFC 7519: Email address ('email') */
  Email: 'email',
  /** Role assertion ('role' or 'roles') */
  Role: 'role',
  /** Roles plural array assertion ('roles') */
  Roles: 'roles',
  /** Scope identifier ('scope' or 'scp') */
  Scope: 'scope',
  /** Permissions identifier ('permissions') */
  Permissions: 'permissions',
  /** RFC 7519: Issuer ('iss') */
  Issuer: 'iss',
  /** RFC 7519: Audience ('aud') */
  Audience: 'aud',
  /** RFC 7519: Expiration time ('exp') */
  Expiration: 'exp',
  /** RFC 7519: Not before ('nbf') */
  NotBefore: 'nbf',
  /** RFC 7519: Issued at ('iat') */
  IssuedAt: 'iat',
} as const;

export type ClaimType = (typeof ClaimTypes)[keyof typeof ClaimTypes] | (string & {});

/**
 * A statement about an entity made by an issuer (e.g. name, role, email, permission).
 */
export interface Claim {
  /** The claim type identifier (e.g., 'sub', 'email', 'role'). */
  readonly type: string;
  /** The value of the claim. */
  readonly value: string;
  /** The issuer that asserted this claim (optional). */
  readonly issuer?: string;
  /** The original value type (optional, e.g. 'string', 'boolean', 'integer'). */
  readonly valueType?: string;
}
