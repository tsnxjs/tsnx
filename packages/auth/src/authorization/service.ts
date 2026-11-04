// SPDX-License-Identifier: MIT

import { HttpContext } from '@tsnx/web';
import { ClaimsPrincipal } from '../claims/claims-principal.js';
import { AuthorizationPolicy } from './policy.js';
import { AuthorizationPolicyBuilder } from './policy-builder.js';
import {
  AuthorizationHandlerContext,
  AuthorizationResult,
} from './types.js';

export interface AuthorizationOptions {
  defaultPolicy?: AuthorizationPolicy;
  fallbackPolicy?: AuthorizationPolicy;
}

export class AuthorizationService {
  private readonly policies: Map<string, AuthorizationPolicy> = new Map();
  public defaultPolicy: AuthorizationPolicy;
  public fallbackPolicy?: AuthorizationPolicy;

  constructor(options: AuthorizationOptions = {}) {
    this.defaultPolicy =
      options.defaultPolicy ??
      new AuthorizationPolicyBuilder('default').requireAuthenticatedUser().build();
    this.fallbackPolicy = options.fallbackPolicy;
  }

  public addPolicy(
    name: string,
    configureOrPolicy: AuthorizationPolicy | ((builder: AuthorizationPolicyBuilder) => void),
  ): void {
    if (typeof configureOrPolicy === 'function') {
      const builder = new AuthorizationPolicyBuilder(name);
      configureOrPolicy(builder);
      this.policies.set(name.toLowerCase(), builder.build());
    } else {
      this.policies.set(name.toLowerCase(), configureOrPolicy);
    }
  }

  public getPolicy(name: string): AuthorizationPolicy | undefined {
    return this.policies.get(name.toLowerCase());
  }

  public async authorize(
    user: ClaimsPrincipal,
    ctx: HttpContext,
    policyOrName?: string | AuthorizationPolicy,
  ): Promise<AuthorizationResult> {
    let policy: AuthorizationPolicy | undefined;

    if (!policyOrName) {
      policy = this.defaultPolicy;
    } else if (typeof policyOrName === 'string') {
      policy = this.getPolicy(policyOrName);
      if (!policy) {
        throw new Error(`[TSNX Auth] The authorization policy "${policyOrName}" was not found.`);
      }
    } else {
      policy = policyOrName;
    }

    const handlerContext = new AuthorizationHandlerContext(policy.requirements, user, ctx);

    for (const requirement of policy.requirements) {
      await requirement.evaluate(handlerContext);
      if (!handlerContext.hasSucceeded && handlerContext.failureReason) {
        break;
      }
    }

    if (handlerContext.hasSucceeded) {
      return AuthorizationResult.success();
    }

    return AuthorizationResult.fail(handlerContext.failureReason);
  }
}
