// SPDX-License-Identifier: MIT

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JwtVerifier } from '../index.js';

async function createSignedToken(payload: Record<string, any>, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = Buffer.from(`${headerB64}.${payloadB64}`, 'utf8');

  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    Buffer.from(secret, 'utf8'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sig = await globalThis.crypto.subtle.sign('HMAC', key, data);
  const sigB64 = Buffer.from(sig).toString('base64url');
  return `${headerB64}.${payloadB64}.${sigB64}`;
}

describe('@tsnx/auth: JWT Verifier', () => {
  const secret = 'super-secure-secret-key-that-is-at-least-32-bytes-long';

  it('successfully verifies a valid HS256 token and extracts claims', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await createSignedToken(
      {
        sub: 'usr_abc',
        iss: 'https://auth.tsnx.dev',
        aud: 'https://api.tsnx.dev',
        roles: ['admin', 'billing'],
        scope: 'read write',
        exp: now + 3600,
        nbf: now - 10,
      },
      secret,
    );

    const verifier = new JwtVerifier({
      secretKey: secret,
      issuer: 'https://auth.tsnx.dev',
      audience: 'https://api.tsnx.dev',
    });

    const verified = await verifier.verify(token);
    assert.equal(verified.payload.sub, 'usr_abc');
    assert.equal(verified.claims.some((c) => c.type === 'sub' && c.value === 'usr_abc'), true);
    assert.equal(verified.claims.filter((c) => c.type === 'role').length, 2);
    assert.equal(verified.claims.filter((c) => c.type === 'scope').length, 2);
  });

  it('rejects expired tokens', async () => {
    const pastTime = Math.floor(Date.now() / 1000) - 1000;
    const token = await createSignedToken(
      {
        sub: 'usr_expired',
        exp: pastTime,
      },
      secret,
    );

    const verifier = new JwtVerifier({
      secretKey: secret,
      clockToleranceSeconds: 5,
    });

    await assert.rejects(async () => {
      await verifier.verify(token);
    }, /expired/i);
  });

  it('rejects token with mismatched issuer or audience', async () => {
    const token = await createSignedToken(
      {
        sub: 'usr_valid',
        iss: 'https://wrong-issuer.com',
        aud: 'https://my-api.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      secret,
    );

    const verifier = new JwtVerifier({
      secretKey: secret,
      issuer: 'https://expected-issuer.com',
    });

    await assert.rejects(async () => {
      await verifier.verify(token);
    }, /issuer/i);
  });

  it('rejects token with corrupted signature', async () => {
    const token = await createSignedToken(
      {
        sub: 'usr_tampered',
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      secret,
    );

    const tampered = token.slice(0, -5) + 'xxxxx';
    const verifier = new JwtVerifier({ secretKey: secret });

    await assert.rejects(async () => {
      await verifier.verify(tampered);
    }, /signature/i);
  });
});
