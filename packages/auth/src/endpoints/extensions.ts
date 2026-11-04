// SPDX-License-Identifier: MIT

import { RouteHandlerBuilder, RouteGroupBuilder } from '@tsnx/web';
import { AUTHORIZE_METADATA_KEY, ALLOW_ANONYMOUS_METADATA_KEY } from './metadata.js';

declare module '@tsnx/web' {
  interface RouteHandlerBuilder {
    /**
     * Requires authorization on this endpoint, optionally specifying a policy name.
     * Modeled after ASP.NET Core [Authorize] / .RequireAuthorization().
     */
    requireAuthorization(policyName?: string): this;

    /**
     * Allows anonymous access to this endpoint, bypassing any group or fallback authorization policy.
     * Modeled after ASP.NET Core [AllowAnonymous] / .AllowAnonymous().
     */
    allowAnonymous(): this;
  }

  interface RouteGroupBuilder {
    /**
     * Requires authorization for all routes declared within this group.
     * Modeled after ASP.NET Core .RequireAuthorization().
     */
    requireAuthorization(policyName?: string): this;

    /**
     * Allows anonymous access for all routes declared within this group.
     * Modeled after ASP.NET Core .AllowAnonymous().
     */
    allowAnonymous(): this;
  }
}

// Attach prototype methods for RouteHandlerBuilder
if (!(RouteHandlerBuilder.prototype as any).requireAuthorization) {
  (RouteHandlerBuilder.prototype as any).requireAuthorization = function (
    this: RouteHandlerBuilder,
    policyName?: string,
  ): RouteHandlerBuilder {
    this.withMetadata(AUTHORIZE_METADATA_KEY, { policyName });
    return this;
  };
}

if (!(RouteHandlerBuilder.prototype as any).allowAnonymous) {
  (RouteHandlerBuilder.prototype as any).allowAnonymous = function (
    this: RouteHandlerBuilder,
  ): RouteHandlerBuilder {
    this.withMetadata(ALLOW_ANONYMOUS_METADATA_KEY, true);
    return this;
  };
}

// Attach prototype methods for RouteGroupBuilder
if (!(RouteGroupBuilder.prototype as any).requireAuthorization) {
  (RouteGroupBuilder.prototype as any).requireAuthorization = function (
    this: RouteGroupBuilder,
    policyName?: string,
  ): RouteGroupBuilder {
    this.withMetadata(AUTHORIZE_METADATA_KEY, { policyName });
    return this;
  };
}

if (!(RouteGroupBuilder.prototype as any).allowAnonymous) {
  (RouteGroupBuilder.prototype as any).allowAnonymous = function (
    this: RouteGroupBuilder,
  ): RouteGroupBuilder {
    this.withMetadata(ALLOW_ANONYMOUS_METADATA_KEY, true);
    return this;
  };
}
