// SPDX-License-Identifier: MIT

export const AUTHORIZE_METADATA_KEY = 'tsnx.auth.authorize';
export const ALLOW_ANONYMOUS_METADATA_KEY = 'tsnx.auth.allow_anonymous';

export interface AuthorizeMetadata {
  readonly policyName?: string;
  readonly roles?: readonly string[];
  readonly schemes?: readonly string[];
}
