// SPDX-License-Identifier: MIT

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AuthorizationService,
  ClaimsPrincipal,
} from '../index.js';
import { HttpContext } from '@tsnx/web';

describe('@tsnx/auth: Policy-Based Authorization', () => {
  const dummyCtx = {} as HttpContext;

  it('evaluates requireAuthenticatedUser policy correctly', async () => {
    const service = new AuthorizationService();
    service.addPolicy('AuthOnly', (b) => b.requireAuthenticatedUser());

    const anon = ClaimsPrincipal.createAnonymous();
    const resultAnon = await service.authorize(anon, dummyCtx, 'AuthOnly');
    assert.equal(resultAnon.succeeded, false);

    const authed = ClaimsPrincipal.fromClaims([{ type: 'sub', value: '1' }]);
    const resultAuthed = await service.authorize(authed, dummyCtx, 'AuthOnly');
    assert.equal(resultAuthed.succeeded, true);
  });

  it('evaluates role-based requirements', async () => {
    const service = new AuthorizationService();
    service.addPolicy('AdminPolicy', (b) => b.requireRole('admin', 'superuser'));

    const userWithoutRole = ClaimsPrincipal.fromClaims([
      { type: 'sub', value: '1' },
      { type: 'role', value: 'viewer' },
    ]);
    const res1 = await service.authorize(userWithoutRole, dummyCtx, 'AdminPolicy');
    assert.equal(res1.succeeded, false);

    const userWithRole = ClaimsPrincipal.fromClaims([
      { type: 'sub', value: '2' },
      { type: 'role', value: 'admin' },
    ]);
    const res2 = await service.authorize(userWithRole, dummyCtx, 'AdminPolicy');
    assert.equal(res2.succeeded, true);
  });

  it('evaluates claim requirements and custom assertions', async () => {
    const service = new AuthorizationService();
    service.addPolicy('SpecialAccess', (b) =>
      b
        .requireClaim('tenant_id', 'tenant_primary')
        .requireAssertion((_ctx, user) => user.hasClaim('tier', 'gold')),
    );

    const partialUser = ClaimsPrincipal.fromClaims([
      { type: 'sub', value: '1' },
      { type: 'tenant_id', value: 'tenant_primary' },
      { type: 'tier', value: 'silver' },
    ]);
    const resFail = await service.authorize(partialUser, dummyCtx, 'SpecialAccess');
    assert.equal(resFail.succeeded, false);

    const fullUser = ClaimsPrincipal.fromClaims([
      { type: 'sub', value: '1' },
      { type: 'tenant_id', value: 'tenant_primary' },
      { type: 'tier', value: 'gold' },
    ]);
    const resSuccess = await service.authorize(fullUser, dummyCtx, 'SpecialAccess');
    assert.equal(resSuccess.succeeded, true);
  });
});
