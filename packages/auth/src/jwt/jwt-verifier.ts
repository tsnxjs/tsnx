// SPDX-License-Identifier: MIT

import { Claim, ClaimTypes } from '../claims/claim.js';
import { JwtHeader, JwtPayload, TokenValidationParameters } from './jwt-types.js';
import { JwksClient } from './jwks.js';

export interface VerifiedJwt {
  header: JwtHeader;
  payload: JwtPayload;
  claims: Claim[];
}

export class JwtVerifier {
  private jwksClient?: JwksClient;

  constructor(private readonly parameters: TokenValidationParameters) {
    if (parameters.jwksUri) {
      this.jwksClient = new JwksClient(parameters.jwksUri, parameters.jwksCacheTtlMs);
    }
  }

  public async verify(token: string): Promise<VerifiedJwt> {
    const parts = token.trim().split('.');
    if (parts.length !== 3) {
      throw new Error('Malformed JWT token: expected 3 dot-separated segments.');
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    let header: JwtHeader;
    let payload: JwtPayload;
    try {
      header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
      payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    } catch {
      throw new Error('Invalid JWT format: failed to decode header or payload JSON.');
    }

    // 1. Signature Verification
    const dataToVerify = Buffer.from(`${headerB64}.${payloadB64}`, 'utf8');
    const signature = Buffer.from(signatureB64, 'base64url');

    const cryptoKey = await this.resolveCryptoKey(header);
    const algorithm = this.resolveAlgorithm(header.alg);

    const isValidSignature = await globalThis.crypto.subtle.verify(
      algorithm,
      cryptoKey,
      signature,
      dataToVerify,
    );

    if (!isValidSignature) {
      throw new Error('JWT signature verification failed.');
    }

    // 2. Validate Lifetime
    if (this.parameters.validateLifetime !== false) {
      const now = Math.floor(Date.now() / 1000);
      const clockTolerance = this.parameters.clockToleranceSeconds ?? 60;

      if (payload.exp !== undefined && typeof payload.exp === 'number') {
        if (payload.exp + clockTolerance < now) {
          throw new Error(`Token has expired at timestamp ${payload.exp} (current time: ${now}).`);
        }
      }

      if (payload.nbf !== undefined && typeof payload.nbf === 'number') {
        if (payload.nbf - clockTolerance > now) {
          throw new Error(`Token is not valid yet (nbf: ${payload.nbf}, current time: ${now}).`);
        }
      }
    }

    // 3. Validate Issuer
    if (this.parameters.validateIssuer !== false && this.parameters.issuer) {
      const validIssuers = Array.isArray(this.parameters.issuer)
        ? this.parameters.issuer
        : [this.parameters.issuer];

      if (!payload.iss || !validIssuers.includes(payload.iss)) {
        throw new Error(
          `Invalid token issuer "${payload.iss}". Expected one of: ${validIssuers.join(', ')}`,
        );
      }
    }

    // 4. Validate Audience
    if (this.parameters.validateAudience !== false && this.parameters.audience) {
      const validAudiences = Array.isArray(this.parameters.audience)
        ? this.parameters.audience
        : [this.parameters.audience];

      const tokenAudiences = Array.isArray(payload.aud)
        ? payload.aud
        : payload.aud
        ? [payload.aud]
        : [];

      const hasMatchingAudience = tokenAudiences.some((aud) => validAudiences.includes(aud));
      if (!hasMatchingAudience) {
        throw new Error(
          `Invalid token audience "${tokenAudiences.join(', ')}". Expected one of: ${validAudiences.join(', ')}`,
        );
      }
    }

    // 5. Extract Claims
    const claims = this.extractClaims(payload);

    return {
      header,
      payload,
      claims,
    };
  }

  private async resolveCryptoKey(header: JwtHeader): Promise<CryptoKey> {
    const alg = header.alg.toUpperCase();

    if (alg.startsWith('HS')) {
      if (!this.parameters.secretKey) {
        throw new Error(`[TSNX Auth] Cannot verify ${alg} token: no secretKey configured in parameters.`);
      }

      if (this.parameters.secretKey instanceof CryptoKey) {
        return this.parameters.secretKey;
      }

      const keyData =
        typeof this.parameters.secretKey === 'string'
          ? Buffer.from(this.parameters.secretKey, 'utf8')
          : this.parameters.secretKey;

      const hash = alg === 'HS384' ? 'SHA-384' : alg === 'HS512' ? 'SHA-512' : 'SHA-256';

      return await globalThis.crypto.subtle.importKey(
        'raw',
        keyData as BufferSource,
        { name: 'HMAC', hash: { name: hash } },
        false,
        ['verify'],
      );
    }

    if (alg.startsWith('RS') || alg.startsWith('ES')) {
      if (this.jwksClient) {
        return await this.jwksClient.getSigningKey(header.kid, alg);
      }

      if (this.parameters.publicKey) {
        if (this.parameters.publicKey instanceof CryptoKey) {
          return this.parameters.publicKey;
        }

        return await this.importPublicKeyPem(this.parameters.publicKey, alg);
      }

      throw new Error(`[TSNX Auth] Cannot verify ${alg} token: neither jwksUri nor publicKey configured.`);
    }

    throw new Error(`Unsupported JWT algorithm: ${header.alg}`);
  }

  private resolveAlgorithm(algName: string): AlgorithmIdentifier | RsaPssParams | EcdsaParams {
    const alg = algName.toUpperCase();
    if (alg.startsWith('HS')) {
      return { name: 'HMAC' };
    }
    if (alg.startsWith('RS')) {
      return { name: 'RSASSA-PKCS1-v1_5' };
    }
    if (alg.startsWith('ES')) {
      return { name: 'ECDSA', hash: { name: 'SHA-256' } };
    }
    throw new Error(`Unsupported algorithm: ${algName}`);
  }

  private async importPublicKeyPem(
    pemOrBuffer: string | Uint8Array,
    alg: string,
  ): Promise<CryptoKey> {
    let derBuffer: Uint8Array;
    if (typeof pemOrBuffer === 'string') {
      const cleanPem = pemOrBuffer
        .replace(/-----BEGIN [A-Z ]+-----/g, '')
        .replace(/-----END [A-Z ]+-----/g, '')
        .replace(/\s+/g, '');
      derBuffer = new Uint8Array(Buffer.from(cleanPem, 'base64'));
    } else {
      derBuffer = pemOrBuffer;
    }

    if (alg.startsWith('RS')) {
      return await globalThis.crypto.subtle.importKey(
        'spki',
        derBuffer as BufferSource,
        { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
        false,
        ['verify'],
      );
    }

    if (alg.startsWith('ES')) {
      return await globalThis.crypto.subtle.importKey(
        'spki',
        derBuffer as BufferSource,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify'],
      );
    }

    throw new Error(`Unsupported algorithm for PEM public key: ${alg}`);
  }

  private extractClaims(payload: JwtPayload): Claim[] {
    const claims: Claim[] = [];
    const issuer = payload.iss;

    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined || value === null) continue;

      if (key === 'roles' || key === 'role') {
        if (Array.isArray(value)) {
          for (const role of value) {
            claims.push({ type: ClaimTypes.Role, value: String(role), issuer });
          }
        } else {
          claims.push({ type: ClaimTypes.Role, value: String(value), issuer });
        }
        continue;
      }

      if (key === 'permissions') {
        if (Array.isArray(value)) {
          for (const perm of value) {
            claims.push({ type: ClaimTypes.Permissions, value: String(perm), issuer });
          }
        } else {
          claims.push({ type: ClaimTypes.Permissions, value: String(value), issuer });
        }
        continue;
      }

      if (key === 'scope') {
        if (typeof value === 'string') {
          for (const s of value.split(' ').filter(Boolean)) {
            claims.push({ type: ClaimTypes.Scope, value: s, issuer });
          }
        } else if (Array.isArray(value)) {
          for (const s of value) {
            claims.push({ type: ClaimTypes.Scope, value: String(s), issuer });
          }
        }
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          claims.push({
            type: key,
            value: typeof item === 'object' ? JSON.stringify(item) : String(item),
            issuer,
          });
        }
      } else {
        claims.push({
          type: key,
          value: typeof value === 'object' ? JSON.stringify(value) : String(value),
          issuer,
        });
      }
    }

    return claims;
  }
}
