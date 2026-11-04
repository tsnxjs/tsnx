// SPDX-License-Identifier: MIT

import { IAuthorizationRequirement } from './types.js';

export interface AuthorizationPolicy {
  readonly name: string;
  readonly requirements: readonly IAuthorizationRequirement[];
  readonly authenticationSchemes?: readonly string[];
}
