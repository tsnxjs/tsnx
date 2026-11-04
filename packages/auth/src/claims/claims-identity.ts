// SPDX-License-Identifier: MIT

import { Claim, ClaimTypes } from './claim.js';

export interface IIdentity {
  /** Indicates whether the identity has been verified through an authentication mechanism. */
  readonly isAuthenticated: boolean;
  /** The authentication mechanism/scheme used to verify this identity (e.g. 'Bearer', 'ApiKey'). */
  readonly authenticationType?: string;
  /** The display name of the identity, typically derived from a Name claim. */
  readonly name?: string;
  /** The collection of claims asserted by this identity. */
  readonly claims: readonly Claim[];
}

/**
 * Concrete identity implementation holding a verified or anonymous set of claims.
 */
export class ClaimsIdentity implements IIdentity {
  public readonly claims: readonly Claim[];
  public readonly authenticationType?: string;
  public readonly nameClaimType: string;
  public readonly roleClaimType: string;

  constructor(
    claims: readonly Claim[] = [],
    authenticationType?: string,
    nameClaimType: string = ClaimTypes.Name,
    roleClaimType: string = ClaimTypes.Role,
  ) {
    this.claims = [...claims];
    this.authenticationType = authenticationType;
    this.nameClaimType = nameClaimType;
    this.roleClaimType = roleClaimType;
  }

  public get isAuthenticated(): boolean {
    return Boolean(this.authenticationType);
  }

  public get name(): string | undefined {
    return this.claims.find((c) => c.type === this.nameClaimType)?.value;
  }
}
