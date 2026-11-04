// SPDX-License-Identifier: MIT

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WebApplication, Results } from '@tsnx/web';
import { WebApplicationFactory } from '@tsnx/testing';
import {
  addAuthentication,
  addAuthorization,
} from '../index.js';

const TEST_SECRET = 'a-very-strong-test-secret-key-of-32-chars!!';

async function createToken(payload: Record<string, any>): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = Buffer.from(`${headerB64}.${payloadB64}`, 'utf8');

  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    Buffer.from(TEST_SECRET, 'utf8'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sig = await globalThis.crypto.subtle.sign('HMAC', key, data);
  const sigB64 = Buffer.from(sig).toString('base64url');
  return `${headerB64}.${payloadB64}.${sigB64}`;
}

describe('@tsnx/auth: WebApplication End-to-End Integration', () => {
  function createApp(): WebApplication {
    const builder = WebApplication.createBuilder();

    addAuthentication(builder.services).addJwtBearer({
      secretKey: TEST_SECRET,
    }).addApiKey({
      headerName: 'x-service-token',
      validator: 'secret-s2s-token-123',
    });

    addAuthorization(builder.services, (authz) => {
      authz.addPolicy('AdminPolicy', (p) => p.requireRole('admin'));
      authz.addPolicy('InventoryManager', (p) => p.requireClaim('dept', 'inventory'));
    });

    const app = builder.build();
    app.useAuth();

    app.mapGet('/api/public', () => Results.text('public content')).allowAnonymous();

    app.mapGet('/api/profile', (ctx) =>
      Results.json({ id: ctx.user.id, roles: ctx.user.roles }),
    ).requireAuthorization();

    app.mapGet('/api/admin', () => Results.text('welcome admin')).requireAuthorization(
      'AdminPolicy',
    );

    const group = app.mapGroup('/api/secure').requireAuthorization();
    group.mapGet('/inventory', (ctx) => Results.json({ user: ctx.user.id, ok: true }));

    return app;
  }

  it('allows access to anonymous endpoints without authorization headers', async () => {
    const factory = new WebApplicationFactory(createApp);
    const client = await factory.createClient();

    const response = await client.get('/api/public');
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'public content');

    await factory.dispose();
  });

  it('returns 401 Unauthorized Problem Details for protected endpoints without credentials', async () => {
    const factory = new WebApplicationFactory(createApp);
    const client = await factory.createClient();

    const response = await client.get('/api/profile');
    assert.equal(response.status, 401);
    assert.ok(response.headers.get('www-authenticate')?.includes('Bearer'));

    const problem = await response.json();
    assert.equal(problem.status, 401);
    assert.equal(problem.title, 'Unauthorized');

    await factory.dispose();
  });

  it('authenticates valid JWT token, attaches ctx.user, and returns 200', async () => {
    const factory = new WebApplicationFactory(createApp);
    const client = await factory.createClient();

    const token = await createToken({
      sub: 'usr_007',
      roles: ['operator'],
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    client.setBearerToken(token);
    const response = await client.get('/api/profile');
    assert.equal(response.status, 200);

    const data = await response.json();
    assert.equal(data.id, 'usr_007');
    assert.deepEqual(data.roles, ['operator']);

    await factory.dispose();
  });

  it('enforces policy: returns 403 Forbidden when user lacks required role', async () => {
    const factory = new WebApplicationFactory(createApp);
    const client = await factory.createClient();

    const token = await createToken({
      sub: 'usr_normal',
      roles: ['viewer'],
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    client.setBearerToken(token);
    const response = await client.get('/api/admin');
    assert.equal(response.status, 403);

    const problem = await response.json();
    assert.equal(problem.status, 403);
    assert.equal(problem.title, 'Forbidden');

    await factory.dispose();
  });

  it('enforces policy: returns 200 when user possesses required role', async () => {
    const factory = new WebApplicationFactory(createApp);
    const client = await factory.createClient();

    const token = await createToken({
      sub: 'usr_admin',
      roles: ['admin'],
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    client.setBearerToken(token);
    const response = await client.get('/api/admin');
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'welcome admin');

    await factory.dispose();
  });

  it('protects route groups transitively with requireAuthorization()', async () => {
    const factory = new WebApplicationFactory(createApp);
    const client = await factory.createClient();

    // 1. Without credentials -> 401
    const unauthedResponse = await client.get('/api/secure/inventory');
    assert.equal(unauthedResponse.status, 401);

    // 2. With valid credentials -> 200
    const token = await createToken({
      sub: 'usr_group_tester',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    client.setBearerToken(token);
    const authedResponse = await client.get('/api/secure/inventory');
    assert.equal(authedResponse.status, 200);
    const data = await authedResponse.json();
    assert.equal(data.user, 'usr_group_tester');

    await factory.dispose();
  });
});
