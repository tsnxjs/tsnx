// SPDX-License-Identifier: MIT

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ClaimTypes, ClaimsIdentity, ClaimsPrincipal } from '../index.js';

describe('@tsnx/auth: Claims System', () => {
  it('creates an anonymous principal by default', () => {
    const anon = ClaimsPrincipal.createAnonymous();
    assert.equal(anon.isAuthenticated, false);
    assert.equal(anon.id, undefined);
    assert.equal(anon.name, undefined);
    assert.deepEqual(anon.roles, []);
    assert.deepEqual(anon.claims, []);
  });

  it('populates identity and helper properties from claims', () => {
    const principal = ClaimsPrincipal.fromClaims([
      { type: ClaimTypes.NameIdentifier, value: 'user_123' },
      { type: ClaimTypes.Name, value: 'Alice Smith' },
      { type: ClaimTypes.Email, value: 'alice@example.com' },
      { type: ClaimTypes.Role, value: 'admin' },
      { type: ClaimTypes.Role, value: 'manager' },
      { type: 'department', value: 'engineering' },
    ]);

    assert.equal(principal.isAuthenticated, true);
    assert.equal(principal.id, 'user_123');
    assert.equal(principal.name, 'Alice Smith');
    assert.deepEqual(principal.roles, ['admin', 'manager']);
    assert.equal(principal.isInRole('admin'), true);
    assert.equal(principal.isInRole('viewer'), false);
    assert.equal(principal.hasClaim('department', 'engineering'), true);
    assert.equal(principal.hasClaim('department', 'marketing'), false);
    assert.equal(principal.hasClaim('email'), true);
  });

  it('correctly handles plural roles and custom claim queries', () => {
    const principal = new ClaimsPrincipal([
      new ClaimsIdentity(
        [
          { type: 'sub', value: 'user_456' },
          { type: 'roles', value: 'operator' },
          { type: 'scope', value: 'read' },
          { type: 'scope', value: 'write' },
        ],
        'CustomAuth',
      ),
    ]);

    assert.equal(principal.isAuthenticated, true);
    assert.equal(principal.isInRole('operator'), true);
    assert.equal(principal.findAll('scope').length, 2);
    assert.equal(principal.findFirst('sub')?.value, 'user_456');
  });
});
