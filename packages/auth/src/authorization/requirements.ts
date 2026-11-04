// SPDX-License-Identifier: MIT

import { IAuthorizationRequirement, AuthorizationHandlerContext } from './types.js';
import { HttpContext } from '@tsnx/web';
import { ClaimsPrincipal } from '../claims/claims-principal.js';

/**
 * Requires the user to have an authenticated identity.
 */
export class DenyAnonymousRequirement implements IAuthorizationRequirement {
  public readonly name = 'DenyAnonymous';

  public evaluate(context: AuthorizationHandlerContext): void {
    if (context.user.isAuthenticated) {
      context.succeed(this);
    } else {
      context.fail('User is not authenticated.');
    }
  }
}

/**
 * Requires the user to possess at least one of the specified roles.
 */
export class RolesRequirement implements IAuthorizationRequirement {
  public readonly name = 'RolesRequirement';
  public readonly allowedRoles: readonly string[];

  constructor(allowedRoles: readonly string[]) {
    this.allowedRoles = [...allowedRoles];
  }

  public evaluate(context: AuthorizationHandlerContext): void {
    if (!context.user.isAuthenticated) {
      context.fail('User is not authenticated.');
      return;
    }

    const hasAnyRole = this.allowedRoles.some((role) => context.user.isInRole(role));
    if (hasAnyRole) {
      context.succeed(this);
    } else {
      context.fail(`User does not possess required role(s): ${this.allowedRoles.join(', ')}.`);
    }
  }
}

/**
 * Requires the user to possess a claim with matching type and optional allowed values.
 */
export class ClaimsRequirement implements IAuthorizationRequirement {
  public readonly name = 'ClaimsRequirement';
  public readonly claimType: string;
  public readonly allowedValues: readonly string[];

  constructor(claimType: string, allowedValues: readonly string[] = []) {
    this.claimType = claimType;
    this.allowedValues = [...allowedValues];
  }

  public evaluate(context: AuthorizationHandlerContext): void {
    if (!context.user.isAuthenticated) {
      context.fail('User is not authenticated.');
      return;
    }

    if (this.allowedValues.length === 0) {
      if (context.user.hasClaim(this.claimType)) {
        context.succeed(this);
      } else {
        context.fail(`User lacks required claim "${this.claimType}".`);
      }
      return;
    }

    const hasMatchingClaim = this.allowedValues.some((val) =>
      context.user.hasClaim(this.claimType, val),
    );

    if (hasMatchingClaim) {
      context.succeed(this);
    } else {
      context.fail(
        `User lacks claim "${this.claimType}" with value matching one of: ${this.allowedValues.join(', ')}.`,
      );
    }
  }
}

/**
 * Evaluates an arbitrary synchronous or asynchronous assertion function.
 */
export class AssertionRequirement implements IAuthorizationRequirement {
  public readonly name = 'AssertionRequirement';

  constructor(
    private readonly assertion: (
      ctx: HttpContext,
      user: ClaimsPrincipal,
    ) => boolean | Promise<boolean>,
  ) {}

  public async evaluate(context: AuthorizationHandlerContext): Promise<void> {
    try {
      const allowed = await this.assertion(context.httpContext, context.user);
      if (allowed) {
        context.succeed(this);
      } else {
        context.fail('Custom authorization assertion returned false.');
      }
    } catch (err: any) {
      context.fail(err?.message ?? 'Authorization assertion threw an error.');
    }
  }
}
