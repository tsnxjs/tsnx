// SPDX-License-Identifier: MIT

import { Claim, ClaimTypes } from './claim.js';
import { ClaimsIdentity, IIdentity } from './claims-identity.js';

/**
 * Represents the security principal context for an executed request, holding one or more identities.
 */
export class ClaimsPrincipal {
  public readonly identities: readonly IIdentity[];

  constructor(identities: readonly IIdentity[] = []) {
    this.identities = identities.length > 0 ? [...identities] : [new ClaimsIdentity([], undefined)];
  }

  /**
   * The primary identity for this user context.
   */
  public get identity(): IIdentity | undefined {
    return this.identities[0];
  }

  /**
   * True if at least one identity in this principal is authenticated.
   */
  public get isAuthenticated(): boolean {
    return this.identities.some((i) => i.isAuthenticated);
  }

  /**
   * The unique subject identifier of the user (from standard 'sub' claim).
   */
  public get id(): string | undefined {
    return this.findFirst(ClaimTypes.NameIdentifier)?.value;
  }

  /**
   * The display name of the user (from primary identity name).
   */
  public get name(): string | undefined {
    return this.identity?.name;
  }

  /**
   * List of all role values asserted across all identities.
   */
  public get roles(): readonly string[] {
    const roles: string[] = [];
    for (const claim of this.claims) {
      if (claim.type === ClaimTypes.Role || claim.type === ClaimTypes.Roles) {
        roles.push(claim.value);
      }
    }
    return roles;
  }

  /**
   * Aggregated claims from all associated identities.
   */
  public get claims(): readonly Claim[] {
    return this.identities.flatMap((i) => i.claims);
  }

  /**
   * Finds the first claim matching the specified type.
   */
  public findFirst(type: string): Claim | undefined {
    return this.claims.find((c) => c.type === type);
  }

  /**
   * Finds all claims matching the specified type.
   */
  public findAll(type: string): readonly Claim[] {
    return this.claims.filter((c) => c.type === type);
  }

  /**
   * Determines whether any claim matches the specified type and optional value.
   */
  public hasClaim(type: string, value?: string): boolean {
    if (value === undefined) {
      return this.claims.some((c) => c.type === type);
    }
    return this.claims.some((c) => c.type === type && c.value === value);
  }

  /**
   * Determines whether the user possesses the specified role.
   */
  public isInRole(role: string): boolean {
    return this.roles.includes(role);
  }

  /**
   * Creates an anonymous (unauthenticated) principal.
   */
  public static createAnonymous(): ClaimsPrincipal {
    return new ClaimsPrincipal([new ClaimsIdentity([], undefined)]);
  }

  /**
   * Creates an authenticated principal with claims and an authentication type.
   */
  public static fromClaims(
    claims: readonly Claim[],
    authenticationType = 'Bearer',
  ): ClaimsPrincipal {
    return new ClaimsPrincipal([new ClaimsIdentity(claims, authenticationType)]);
  }
}
