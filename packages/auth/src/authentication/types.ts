// SPDX-License-Identifier: MIT

import { HttpContext } from '@tsnx/web';
import { AuthenticateResult } from './result.js';

/**
 * Interface implemented by scheme-specific authentication handlers.
 */
export interface IAuthenticationHandler {
  /** The scheme name (e.g., 'Bearer', 'ApiKey'). */
  readonly scheme: string;

  /**
   * Evaluates the incoming request and returns an authentication outcome.
   */
  authenticate(ctx: HttpContext): Promise<AuthenticateResult>;
}

export interface AuthenticationOptions {
  /** The default authentication scheme name to use when none is specified (defaults to 'Bearer'). */
  defaultScheme?: string;
  /** Whether to challenge the request automatically when authentication fails. */
  requireAuthenticatedUserByDefault?: boolean;
}
