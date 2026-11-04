// SPDX-License-Identifier: MIT

import { HttpContext } from '@tsnx/web';
import { ClaimsPrincipal } from '../claims/claims-principal.js';

/**
 * A marker interface for an authorization requirement.
 */
export interface IAuthorizationRequirement {
  /** Descriptive name or code for this requirement. */
  readonly name?: string;

  /**
   * Evaluates the requirement against the given context.
   */
  evaluate(context: AuthorizationHandlerContext): void | Promise<void>;
}

/**
 * State tracking context for requirement evaluation.
 */
export class AuthorizationHandlerContext {
  private readonly pendingRequirements: Set<IAuthorizationRequirement>;
  private _failed = false;
  private _failureReason?: string;

  constructor(
    public readonly requirements: readonly IAuthorizationRequirement[],
    public readonly user: ClaimsPrincipal,
    public readonly httpContext: HttpContext,
  ) {
    this.pendingRequirements = new Set(requirements);
  }

  /**
   * Marks a specific requirement as fulfilled.
   */
  public succeed(requirement: IAuthorizationRequirement): void {
    this.pendingRequirements.delete(requirement);
  }

  /**
   * Explicitly fails the authorization evaluation.
   */
  public fail(reason?: string): void {
    this._failed = true;
    if (reason && !this._failureReason) {
      this._failureReason = reason;
    }
  }

  /**
   * True if all requirements were satisfied and no explicit failure was recorded.
   */
  public get hasSucceeded(): boolean {
    return !this._failed && this.pendingRequirements.size === 0;
  }

  public get failureReason(): string | undefined {
    return this._failureReason;
  }
}

/**
 * Result of evaluating an authorization policy.
 */
export class AuthorizationResult {
  private constructor(
    public readonly succeeded: boolean,
    public readonly failureReason?: string,
  ) {}

  public static success(): AuthorizationResult {
    return new AuthorizationResult(true);
  }

  public static fail(reason?: string): AuthorizationResult {
    return new AuthorizationResult(false, reason);
  }
}
