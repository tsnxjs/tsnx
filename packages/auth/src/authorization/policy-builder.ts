// SPDX-License-Identifier: MIT

import { HttpContext } from '@tsnx/web';
import { ClaimsPrincipal } from '../claims/claims-principal.js';
import { IAuthorizationRequirement } from './types.js';
import { AuthorizationPolicy } from './policy.js';
import {
  DenyAnonymousRequirement,
  RolesRequirement,
  ClaimsRequirement,
  AssertionRequirement,
} from './requirements.js';

export class AuthorizationPolicyBuilder {
  private readonly requirements: IAuthorizationRequirement[] = [];
  private authenticationSchemes: string[] = [];

  constructor(private readonly policyName: string = 'default') {}

  /**
   * Requires that the user identity is authenticated.
   */
  public requireAuthenticatedUser(): this {
    this.requirements.push(new DenyAnonymousRequirement());
    return this;
  }

  /**
   * Requires that the user possesses at least one of the given roles.
   */
  public requireRole(...roles: string[]): this {
    this.requirements.push(new RolesRequirement(roles));
    return this;
  }

  /**
   * Requires that the user possesses a claim of the specified type with one of the allowed values.
   */
  public requireClaim(claimType: string, ...allowedValues: string[]): this {
    this.requirements.push(new ClaimsRequirement(claimType, allowedValues));
    return this;
  }

  /**
   * Requires that a custom predicate function evaluates to true.
   */
  public requireAssertion(
    predicate: (ctx: HttpContext, user: ClaimsPrincipal) => boolean | Promise<boolean>,
  ): this {
    this.requirements.push(new AssertionRequirement(predicate));
    return this;
  }

  /**
   * Restricts evaluation to specific authentication scheme(s).
   */
  public addAuthenticationSchemes(...schemes: string[]): this {
    this.authenticationSchemes.push(...schemes);
    return this;
  }

  /**
   * Adds an arbitrary requirement to the policy.
   */
  public addRequirement(requirement: IAuthorizationRequirement): this {
    this.requirements.push(requirement);
    return this;
  }

  public build(): AuthorizationPolicy {
    return {
      name: this.policyName,
      requirements: [...this.requirements],
      authenticationSchemes:
        this.authenticationSchemes.length > 0 ? [...this.authenticationSchemes] : undefined,
    };
  }
}
