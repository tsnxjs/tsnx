// SPDX-License-Identifier: MIT

import { ClaimsPrincipal } from '../claims/claims-principal.js';

/**
 * Result of an authentication check executed by an authentication handler.
 */
export class AuthenticateResult {
  private constructor(
    public readonly succeeded: boolean,
    public readonly principal?: ClaimsPrincipal,
    public readonly failure?: Error | string,
    public readonly none: boolean = false,
  ) {}

  /**
   * Indicates successful verification producing a valid ClaimsPrincipal.
   */
  public static success(principal: ClaimsPrincipal): AuthenticateResult {
    return new AuthenticateResult(true, principal, undefined, false);
  }

  /**
   * Indicates an explicit authentication failure (e.g., expired token, bad signature).
   */
  public static fail(failure: Error | string): AuthenticateResult {
    return new AuthenticateResult(false, undefined, failure, false);
  }

  /**
   * Indicates no credentials were provided in the request (anonymous).
   */
  public static noResult(): AuthenticateResult {
    return new AuthenticateResult(false, undefined, undefined, true);
  }
}
