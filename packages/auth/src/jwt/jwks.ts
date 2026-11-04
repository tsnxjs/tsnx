// SPDX-License-Identifier: MIT

export interface JsonWebKeyItem extends JsonWebKey {
  kid?: string;
  alg?: string;
  use?: string;
  kty: string;
  crv?: string;
  x?: string;
  y?: string;
  n?: string;
  e?: string;
}

export interface JsonWebKeySet {
  keys: JsonWebKeyItem[];
}

export class JwksClient {
  private cachedKeys: Map<string, { key: CryptoKey; cachedAt: number }> = new Map();
  private readonly uri: string;
  private readonly cacheTtlMs: number;

  constructor(uri: string, cacheTtlMs = 10 * 60 * 1000) {
    this.uri = uri;
    this.cacheTtlMs = cacheTtlMs;
  }

  public async getSigningKey(kid?: string, alg = 'RS256'): Promise<CryptoKey> {
    const cacheKey = `${kid ?? 'default'}:${alg}`;
    const cached = this.cachedKeys.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.cachedAt < this.cacheTtlMs) {
      return cached.key;
    }

    await this.refreshKeys();

    const freshKey = this.cachedKeys.get(cacheKey);
    if (!freshKey) {
      // If kid wasn't found specifically, look for any matching key if kid wasn't provided
      if (!kid && this.cachedKeys.size > 0) {
        return Array.from(this.cachedKeys.values())[0].key;
      }
      throw new Error(`[TSNX Auth] Unable to find signing key with kid "${kid}" from JWKS endpoint "${this.uri}".`);
    }

    return freshKey.key;
  }

  private async refreshKeys(): Promise<void> {
    const response = await fetch(this.uri, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(
        `[TSNX Auth] Failed to fetch JWKS from "${this.uri}": HTTP ${response.status} ${response.statusText}`,
      );
    }

    const jwks = (await response.json()) as JsonWebKeySet;
    if (!jwks || !Array.isArray(jwks.keys)) {
      throw new Error(`[TSNX Auth] Invalid JWKS payload received from "${this.uri}". Expected "keys" array.`);
    }

    const now = Date.now();
    for (const jwk of jwks.keys) {
      try {
        const cryptoKey = await this.importJwk(jwk);
        const alg = jwk.alg ?? (jwk.kty === 'RSA' ? 'RS256' : 'ES256');
        const keyId = jwk.kid ?? 'default';
        this.cachedKeys.set(`${keyId}:${alg}`, { key: cryptoKey, cachedAt: now });
      } catch {
        // Skip unparseable keys in the set
      }
    }
  }

  private async importJwk(jwk: JsonWebKeyItem): Promise<CryptoKey> {
    if (jwk.kty === 'RSA') {
      return await globalThis.crypto.subtle.importKey(
        'jwk',
        jwk,
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: { name: 'SHA-256' },
        },
        false,
        ['verify'],
      );
    }

    if (jwk.kty === 'EC') {
      return await globalThis.crypto.subtle.importKey(
        'jwk',
        jwk,
        {
          name: 'ECDSA',
          namedCurve: jwk.crv || 'P-256',
        },
        false,
        ['verify'],
      );
    }

    throw new Error(`Unsupported JWK key type: ${jwk.kty}`);
  }
}
